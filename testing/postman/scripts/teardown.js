// Deletes rows from the reserved pm-%@picklerick.test test namespace (D3).
// Normal runs narrow this to their UUID; standalone recovery sweeps all pm-
// accounts. Never create intentional development accounts in this namespace.
//
// Goes through `docker compose exec ... psql` rather than an API endpoint or
// the users-row ON DELETE CASCADE, because:
//   - there is no DELETE endpoint that removes only test rows, and building
//     one under test-cleanup pressure is how cascade semantics get decided
//     by accident (D4);
//   - a single `DELETE FROM users` cascade is not safe here: order_items.item_id
//     is ON DELETE RESTRICT in db/schema.sql, so cascading into items aborts
//     with a foreign-key violation the moment any order references one (D5).
// Deletion order below is children-first for exactly that reason.
//
// See docs/specs/2026-08-08-postman-newman-scaffolding-design.md D4/D5.

const { spawn } = require('child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../..');
const REPORT_DIR = path.resolve(__dirname, '../newman');
const UPLOAD_DIR = path.join(ROOT, 'backend-node/uploads');

const TEARDOWN_SQL = `
BEGIN;

DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE player_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
     OR court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'))
);

DELETE FROM orders WHERE player_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
   OR court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM booking_players WHERE player_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
   OR booking_id IN (SELECT id FROM bookings WHERE booked_by IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM bookings WHERE booked_by IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
   OR court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM items WHERE court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test');

DELETE FROM users WHERE email LIKE 'pm-%@picklerick.test';

COMMIT;
`;

async function cleanupUploads(uploadManifest) {
  // PR-35 / NFR-03: remove only files owned by the disposable uploader recorded
  // BEFORE upload. This also catches a file written before HTTP/DB failure.
  const manifests = uploadManifest ? [path.basename(uploadManifest)] :
    (await fs.readdir(REPORT_DIR).catch(err => {
      if (err.code === 'ENOENT') return [];
      throw err;
    })).filter(name => /^uploads-[0-9a-f-]{36}\.json$/i.test(name));
  for (const name of manifests) {
    const manifest = path.join(REPORT_DIR, name);
    let data;
    try { data = JSON.parse(await fs.readFile(manifest, 'utf8')); }
    catch (err) { if (err.code === 'ENOENT') continue; throw err; }
    // Read older exact-filename manifests too, for interrupted-run recovery.
    let photos = data;
    if (!Array.isArray(data)) {
      if (!Array.isArray(data.uploadUserIds) || !data.uploadUserIds.every(id => /^[0-9a-f-]{36}$/i.test(id))) {
        throw new Error(`Invalid disposable uploader in ${name}`);
      }
      const files = await fs.readdir(UPLOAD_DIR).catch(err => {
        if (err.code === 'ENOENT') return [];
        throw err;
      });
      photos = files.filter(file => {
        const match = /^([0-9a-f-]{36})-\d+\.svg$/i.exec(file);
        return match && data.uploadUserIds.includes(match[1]);
      }).map(file => `/uploads/${file}`);
    }
    for (const photo of photos) {
      if (!/^\/uploads\/[0-9a-f-]{36}-\d+\.svg$/i.test(photo)) {
        throw new Error(`Invalid test upload path in ${name}`);
      }
      await fs.rm(path.join(UPLOAD_DIR, path.basename(photo)), { force: true });
    }
    await fs.unlink(manifest);
  }
}

function cleanupDatabase(runId) {
  return new Promise((resolve, reject) => {
    const psql = spawn(
      'docker',
      [
        'compose',
        'exec',
        '-T',
        'postgres',
        'psql',
        '-U',
        'pickle_rick',
        '-d',
        'pickle_rick',
        '-v',
        'ON_ERROR_STOP=1',
      ],
      // stderr is captured (not inherited) so a Docker/psql failure surfaces
      // as our own readable message below, not a raw stack trace on stdout.
      // PR-35: resolve Compose from the repo root, not testing/postman.
      // Otherwise a sibling Compose project can be selected by the shell cwd.
      { cwd: ROOT, stdio: ['pipe', 'inherit', 'pipe'] }
    );

    let stderr = '';
    psql.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    psql.on('error', (err) => {
      reject(
        new Error(
          `Could not reach the Docker stack (${err.message}). Is it running? Try "docker compose up --build".`
        )
      );
    });

    psql.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `teardown psql exited with code ${code}. Is the stack running ("docker compose up --build")?\n${stderr.trim()}`
          )
        );
        return;
      }
      resolve();
    });

    // Normal runs clean only their own accounts, so concurrent runs survive.
    // Standalone recovery intentionally sweeps the reserved Postman namespace.
    const sql = runId ? TEARDOWN_SQL.replaceAll('pm-%@picklerick.test', `pm-${runId}-%@picklerick.test`) : TEARDOWN_SQL;
    psql.stdin.write(sql);
    psql.stdin.end();
  });
}

async function teardown({ uploadManifest, runId } = {}) {
  if (runId && !/^[0-9a-f-]{36}$/i.test(runId)) throw new Error('Invalid Postman run ID');
  // PR-35: a locked/missing photo manifest must not prevent database cleanup,
  // and a Docker failure must not prevent removing uploaded test files.
  const results = await Promise.allSettled([cleanupUploads(uploadManifest), cleanupDatabase(runId)]);
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new Error(errors.map(error => error.message).join('\n'));
}

module.exports = teardown;

if (require.main === module) {
  teardown()
    .then(() => {
      console.log('Teardown complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
