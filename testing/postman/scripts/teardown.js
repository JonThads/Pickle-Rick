// Deletes every row a Postman run could have created, scoped strictly to the
// pm-%@picklerick.test email prefix (D3) - so this is structurally incapable
// of touching a row a human created by hand.
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

function teardown() {
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
      { stdio: ['pipe', 'inherit', 'pipe'] }
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

    psql.stdin.write(TEARDOWN_SQL);
    psql.stdin.end();
  });
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
