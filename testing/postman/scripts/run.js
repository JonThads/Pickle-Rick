// Drives the suite through Newman's Node API rather than the bare CLI, so
// teardown can run inside a `finally` block and fire on pass, on assertion
// failure, and on thrown exception alike - see
// docs/specs/2026-08-08-postman-newman-scaffolding-design.md D6.
//
// Known gap, accepted: `finally` does not run on SIGINT. A run killed with
// Ctrl+C can leave rows behind; `npm run teardown` recovers the reserved pm-
// namespace. Normal runs clean only their own UUID so overlapping runs survive.

const path = require('path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const newman = require('newman');
const teardown = require('./teardown');
const { spawnSync } = require('node:child_process');

const COLLECTION = path.join(__dirname, '..', 'PickleRick.postman_collection.json');
const ENVIRONMENT = path.join(__dirname, '..', 'environments', 'local.postman_environment.json');
const REPORT_DIR = path.join(__dirname, '..', 'newman');
// PR-35 / UC-01: account deletion removes the database row but leaves the
// uploaded file. Persist the disposable uploader's ID before any upload, so
// cleanup also recovers files written before an HTTP/database failure.
const RUN_ID = randomUUID();
const UPLOAD_MANIFEST = path.join(REPORT_DIR, `uploads-${RUN_ID}.json`);

function runNewman() {
  return new Promise((resolve, reject) => {
    const run = newman.run(
      {
        collection: COLLECTION,
        environment: ENVIRONMENT,
        envVar: [
          { key: 'postmanRunId', value: RUN_ID },
          ...(process.env.POSTMAN_BASE_URL ? [{ key: 'baseUrl', value: process.env.POSTMAN_BASE_URL }] : []),
        ],
        workingDir: path.join(__dirname, '..'),
        // NFR-03: reports must not retain runtime passwords or bearer tokens.
        reporters: ['cli', 'htmlextra'],
        reporter: {
          htmlextra: {
            export: path.join(REPORT_DIR, 'report.html'),
            skipSensitiveData: true,
          },
        },
      },
      (err, summary) => {
        if (err) return reject(err);
        resolve(summary);
      }
    );
    run.on('request', (err, args) => {
      if (err || args.item.name !== 'Register - player' || args.response.code !== 201) return;
      try {
        const userId = args.response.json().user.id;
        if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid disposable uploader ID');
        fs.mkdirSync(REPORT_DIR, { recursive: true });
        fs.writeFileSync(UPLOAD_MANIFEST, JSON.stringify({ uploadUserIds: [userId] }));
      } catch (error) {
        // Stop before any upload if its owner cannot be recorded for cleanup.
        run.abort();
        reject(new Error(`Could not record disposable uploader: ${error.message}`));
      }
    });
  });
}

(async () => {
  let exitCode = 0;

  try {
    // PR-35: fail before creating API data if SQL cleanup cannot reach this
    // Compose project. Respect COMPOSE_PROJECT_NAME for isolated verification.
    const stack = spawnSync('docker', ['compose', 'ps', '--status', 'running', '--services'], {
      cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8',
    });
    if (stack.error || stack.status !== 0 || !stack.stdout.split(/\s+/).includes('postgres')) {
      throw new Error('Postgres is not running in the selected Compose project. Start docker compose up --build; set COMPOSE_PROJECT_NAME if using a named stack.');
    }
    const summary = await runNewman();
    if (summary.run.failures.length > 0) {
      exitCode = 1;
    }
  } catch (err) {
    console.error('Newman run failed to start:', err.message);
    exitCode = 1;
  } finally {
    try {
      await teardown({ uploadManifest: UPLOAD_MANIFEST, runId: RUN_ID });
    } catch (err) {
      console.error('Teardown failed:', err.message);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
})();
