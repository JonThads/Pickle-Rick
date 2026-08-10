// Drives the suite through Newman's Node API rather than the bare CLI, so
// teardown can run inside a `finally` block and fire on pass, on assertion
// failure, and on thrown exception alike - see
// docs/specs/2026-08-08-postman-newman-scaffolding-design.md D6.
//
// Known gap, accepted: `finally` does not run on SIGINT. A run killed with
// Ctrl+C leaves rows behind; the next run's teardown sweeps them up because
// cleanup is scoped by the pm- prefix (D3), not by "rows this run made".

const path = require('path');
const newman = require('newman');
const teardown = require('./teardown');

const COLLECTION = path.join(__dirname, '..', 'PickleRick.postman_collection.json');
const ENVIRONMENT = path.join(__dirname, '..', 'environments', 'local.postman_environment.json');
const REPORT_DIR = path.join(__dirname, '..', 'newman');

function runNewman() {
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection: COLLECTION,
        environment: ENVIRONMENT,
        reporters: ['cli', 'htmlextra'],
        reporter: {
          htmlextra: {
            export: path.join(REPORT_DIR, 'report.html'),
          },
        },
      },
      (err, summary) => {
        if (err) return reject(err);
        resolve(summary);
      }
    );
  });
}

(async () => {
  let exitCode = 0;

  try {
    const summary = await runNewman();
    if (summary.run.failures.length > 0) {
      exitCode = 1;
    }
  } catch (err) {
    console.error('Newman run failed to start:', err.message);
    exitCode = 1;
  } finally {
    try {
      await teardown();
    } catch (err) {
      console.error('Teardown failed:', err.message);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
})();
