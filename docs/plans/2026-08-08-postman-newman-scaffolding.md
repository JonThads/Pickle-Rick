# Postman/Newman Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `testing/postman/` with a runnable, reproducible Newman setup and a working teardown, containing no test requests.

**Architecture:** A self-contained npm project under `testing/postman/`, mirroring how `testing/playwright/` is structured. Newman is driven through its Node API by `scripts/run.js` rather than the bare CLI, so `scripts/teardown.js` can run in a `finally` block and clean up on failure as well as success. Teardown reaches Postgres through `docker compose exec` and deletes only rows whose email carries the `pm-` test prefix.

**Tech Stack:** Node.js 24, Newman 6.x, newman-reporter-htmlextra, PostgreSQL 16 (via `docker compose exec psql`), Postman Collection Format v2.1.

**Spec:** [`docs/specs/2026-08-08-postman-newman-scaffolding-design.md`](../specs/2026-08-08-postman-newman-scaffolding-design.md) — decision IDs (D1–D8) below refer to that document.

## Global Constraints

- **Branch:** all work lands on `test/postman-initial-setup`, cut from `qa`. Never commit to `qa` or `main` directly.
- **Commit format:** `[test]: description` — bracketed type per `docs/claude-instructions.md`. Doc-only commits use `[docs]:`.
- **No test requests.** Every collection folder ships empty. Adding a request is out of scope and belongs to `test/postman-smoke`.
- **Test-data prefix (D3):** `pm-{{runId}}-<role>@picklerick.test`. The literal SQL pattern is `pm-%@picklerick.test`, used verbatim in teardown.
- **DB credentials (matches `docker-compose.yml`):** user `pickle_rick`, database `pickle_rick`, service name `postgres`.
- **Base URL:** `http://localhost:4000`.
- **Comment density:** this repo comments heavily and explains *why*, not *what* (`CLAUDE.md`). Match the tone of `testing/playwright/config/credentials.ts` and `db/schema.sql`.
- **Never commit:** the real environment file, any token, any report output.

## Testing approach for this plan

Scaffolding has no assertion framework, so "write a failing test" means **run the verification command and confirm it fails for the expected reason** before writing the file that fixes it. Do not skip the failing run — it is what distinguishes "my change worked" from "it was already passing."

## File Structure

| File | Responsibility |
| --- | --- |
| `testing/postman/package.json` | Dependency pinning and the two entry-point scripts. Nothing else. |
| `testing/postman/scripts/teardown.js` | Owns all SQL and all knowledge of the schema. Exported as a function so `run.js` can call it, and executable standalone. |
| `testing/postman/scripts/run.js` | Owns the Newman invocation and the guarantee that teardown runs. Contains no SQL. |
| `testing/postman/PickleRick.postman_collection.json` | Folder structure, `runId` minting, variable declarations. |
| `testing/postman/environments/*.json` | Environment values only. |
| `testing/postman/README.md` | How to run, the conventions, the known limitations. |

The `run.js` / `teardown.js` split is the important one: teardown must be callable without running Newman (after a Ctrl+C), and `run.js` must not grow SQL. One file owns the database, the other owns the test runner.

---

### Task 1: Verify Newman's behaviour on an empty collection

The spec's acceptance criterion 2 assumes Newman runs a request-less collection and exits 0. That is **unverified**, and if it is wrong, decision D7 changes. Resolve it before writing any real file.

**Files:**
- Create: `<scratchpad>/newman-spike/spike.postman_collection.json` (throwaway — not in the repo)

- [ ] **Step 1: Write a throwaway collection with one empty folder**

Write to the session scratchpad directory, **not** into `C:\Projects\pickle-rick`:

```json
{
  "info": {
    "name": "Spike",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    { "name": "Smoke", "item": [] }
  ]
}
```

- [ ] **Step 2: Run Newman against it and record the outcome**

```bash
npx newman run spike.postman_collection.json; echo "EXIT CODE: $?"
```

- [ ] **Step 3: Interpret the result and decide**

- **Exit code 0** → D7 holds unchanged. Record the observed exit code in the task notes and continue to Task 2.
- **Non-zero exit, or an error like "collection is empty"** → D7 needs one amendment: the `Smoke` folder gets its `GET /health` request in Task 5 after all, because a collection needs at least one runnable item. `GET /health` requires no auth and creates no rows, so it does not violate the "no test content" scope in any meaningful way. **Stop and report this to the user before proceeding** — it is a spec change, not an implementation detail.

- [ ] **Step 4: Delete the spike directory**

No commit for this task — nothing in the repo changed.

---

### Task 2: npm project with Newman pinned

**Files:**
- Create: `testing/postman/package.json`
- Create: `testing/postman/package-lock.json` (generated — never hand-edited)

**Interfaces:**
- Produces: `npm test` → `node scripts/run.js`; `npm run teardown` → `node scripts/teardown.js`. Later tasks create those two files.

- [ ] **Step 1: Confirm the directory does not yet exist**

```bash
ls testing/postman
```

Expected: `No such file or directory`. If it exists, stop — someone else started this branch.

- [ ] **Step 2: Create `testing/postman/package.json`**

```json
{
  "name": "pickle-rick-postman",
  "version": "1.0.0",
  "description": "Postman/Newman API test suite for Pickle Rick. Run with `npm test` - never bare `newman run`, which skips teardown.",
  "private": true,
  "license": "ISC",
  "scripts": {
    "test": "node scripts/run.js",
    "teardown": "node scripts/teardown.js"
  },
  "devDependencies": {
    "newman": "^6.2.2",
    "newman-reporter-htmlextra": "^1.23.1"
  }
}
```

`"private": true` is deliberate — it makes an accidental `npm publish` impossible. The `name` differs from `testing/playwright/package.json`'s (which is just `pickle-rick`) so the two suites are distinguishable in tooling output.

- [ ] **Step 3: Install, generating the lockfile**

```bash
cd testing/postman && npm install
```

- [ ] **Step 4: Verify Newman resolves locally rather than globally**

```bash
cd testing/postman && node -e "console.log(require.resolve('newman'))"
```

Expected: a path inside `testing/postman/node_modules/`. If it resolves anywhere else, the install did not work — do not continue, since D1's whole point is that the version is repo-local.

- [ ] **Step 5: Confirm `node_modules` is already ignored**

```bash
cd testing/postman && git status --short
```

Expected: `package.json` and `package-lock.json` as untracked; **no** `node_modules` entries (the root `.gitignore` already has `node_modules/`). If `node_modules` appears, stop and fix the ignore rule first.

- [ ] **Step 6: Commit**

```bash
git add testing/postman/package.json testing/postman/package-lock.json && git commit -m "[test]: scaffold testing/postman npm project with newman pinned"
```

---

### Task 3: Teardown script

The load-bearing task. This is what makes the branch verifiable at all (spec acceptance criterion 3).

**Files:**
- Create: `testing/postman/scripts/teardown.js`

**Interfaces:**
- Produces: `module.exports = { teardown }` where `teardown()` returns `{ ok: boolean, output: string }` and never throws. `run.js` (Task 5) consumes exactly this shape — it must not throw, because it is called from a `finally` block where a throw would mask the original failure.

- [ ] **Step 1: Confirm the stack is running**

```bash
docker compose ps --format "table {{.Service}}\t{{.Status}}"
```

Expected: `postgres` present and healthy. If not, run `docker compose up --build` in a second terminal first — teardown cannot be verified against a stopped stack.

- [ ] **Step 2: Run the verification command and watch it fail**

```bash
cd testing/postman && npm run teardown
```

Expected: failure — `Cannot find module '.../scripts/teardown.js'`. This is the red state.

- [ ] **Step 3: Write `testing/postman/scripts/teardown.js`**

```js
#!/usr/bin/env node
// =============================================================================
// Postman/Newman suite teardown
// =============================================================================
// CLAUDE.md requires every test suite to delete the rows it created, so the
// dev database only ever holds data someone entered on purpose.
//
// This talks to Postgres directly instead of calling the API, because there
// is no DELETE endpoint for users - see decision D4 in
// docs/specs/2026-08-08-postman-newman-scaffolding-design.md for why adding
// one was deliberately left to its own branch.
//
// Safe by construction: every statement is scoped to emails matching
// 'pm-%@picklerick.test'. Rows a human created cannot match that pattern,
// so this script structurally cannot delete real data.

const { spawnSync } = require('child_process');
const path = require('path');

// scripts/ -> postman/ -> testing/ -> repo root, where docker-compose.yml lives.
const REPO_ROOT = path.resolve(__dirname, '../../..');

// The single source of truth for "is this row ours?". If this ever changes,
// the collection's runId pre-request script must change to match.
const TEST_EMAIL_PATTERN = 'pm-%@picklerick.test';

const TEST_USERS = `SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PATTERN}'`;
const TEST_COURTS = `SELECT id FROM courts WHERE admin_id IN (${TEST_USERS})`;

// Deletes run child-table-first rather than relying on ON DELETE CASCADE from
// users. The cascade LOOKS sufficient but is not: order_items.item_id is
// ON DELETE RESTRICT (db/schema.sql), and Postgres cannot defer a RESTRICT
// check - so cascading from a test admin into items aborts the whole delete
// the moment any order line references one of those items. No order endpoints
// exist yet, so this cannot fire today; it fires on the first run after BR-07
// ships. See decision D5.
//
// Wrapped in a transaction so a partial failure rolls back. A half-cleaned
// database is the worst outcome: neither clean nor reproducible.
const SQL = `
BEGIN;
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE player_id IN (${TEST_USERS}) OR court_id IN (${TEST_COURTS})
);
DELETE FROM orders WHERE player_id IN (${TEST_USERS}) OR court_id IN (${TEST_COURTS});
DELETE FROM booking_players WHERE player_id IN (${TEST_USERS})
   OR booking_id IN (SELECT id FROM bookings WHERE booked_by IN (${TEST_USERS}));
DELETE FROM bookings WHERE booked_by IN (${TEST_USERS}) OR court_id IN (${TEST_COURTS});
DELETE FROM items WHERE court_id IN (${TEST_COURTS});
DELETE FROM courts WHERE admin_id IN (${TEST_USERS});
DELETE FROM users WHERE email LIKE '${TEST_EMAIL_PATTERN}';
COMMIT;
`;

/**
 * Deletes every row this suite could have created.
 *
 * Never throws - run.js calls this from a `finally` block, where a throw
 * would mask whatever failure sent us there in the first place. Failures are
 * reported through the returned `ok` flag instead.
 *
 * @returns {{ ok: boolean, output: string }}
 */
function teardown() {
    const result = spawnSync(
        'docker',
        [
            'compose', 'exec', '-T', 'postgres',
            'psql', '-U', 'pickle_rick', '-d', 'pickle_rick',
            // Without this, psql reports an error on one statement and then
            // cheerfully carries on - leaving rows behind while exiting 0.
            '-v', 'ON_ERROR_STOP=1',
        ],
        { cwd: REPO_ROOT, input: SQL, encoding: 'utf-8' }
    );

    if (result.error) {
        return {
            ok: false,
            output: `Could not run docker: ${result.error.message}\n` +
                'Is Docker installed and on your PATH?',
        };
    }

    if (result.status !== 0) {
        return {
            ok: false,
            output: `${result.stderr || result.stdout}\n` +
                'Teardown failed. Most likely the stack is not running - start it with ' +
                '`docker compose up --build` and re-run `npm run teardown`.',
        };
    }

    return { ok: true, output: result.stdout.trim() };
}

module.exports = { teardown };

// Allow `node scripts/teardown.js` as well as being imported by run.js. This
// standalone path matters: a run killed with Ctrl+C skips run.js's finally
// block, so cleaning up by hand has to stay possible.
if (require.main === module) {
    const { ok, output } = teardown();
    console.log(output);
    if (!ok) {
        process.exit(1);
    }
    console.log('\nTeardown complete - no test rows remain.');
}
```

- [ ] **Step 4: Run it and verify green**

```bash
cd testing/postman && npm run teardown
```

Expected: seven `DELETE 0` lines (plus `BEGIN` and `COMMIT`), then `Teardown complete`, exit 0.

`DELETE 0` is the success case, not a warning — nothing has created test rows yet. What this proves is everything risky: `docker compose exec` reaches the container, the psql credentials are right, all seven statements parse against the real schema, and the dependency order is valid.

- [ ] **Step 5: Verify the failure path is readable**

```bash
docker compose stop postgres && cd testing/postman && npm run teardown; echo "EXIT: $?"
```

Expected: a message naming the stopped stack as the likely cause, exit 1 — not a raw Docker stack trace (spec acceptance criterion 4).

Then restart it:

```bash
docker compose start postgres
```

- [ ] **Step 6: Commit**

```bash
git add testing/postman/scripts/teardown.js && git commit -m "[test]: add postman suite teardown with prefix-scoped ordered deletes"
```

---

### Task 4: Collection and environment files

**Files:**
- Create: `testing/postman/PickleRick.postman_collection.json`
- Create: `testing/postman/environments/local.postman_environment.example.json`
- Create: `testing/postman/environments/local.postman_environment.json` (gitignored)
- Modify: `.gitignore`

**Interfaces:**
- Produces: collection variables `runId`, `authToken`, `courtId`, `bookingId` (all empty at rest); environment variable `baseUrl`. Task 5's `run.js` loads both files by path.

- [ ] **Step 1: Verify the collection path in CLAUDE.md is still unsatisfied**

```bash
ls testing/postman/PickleRick.postman_collection.json
```

Expected: `No such file or directory`. This is the file `CLAUDE.md` has referenced all along.

- [ ] **Step 2: Write the collection**

Folder names match the sheet names in `testing/test-cases/Pickle Rick Test Cases.xlsx` exactly, so the `Ref No` mapping stays mechanical (D7).

```json
{
  "info": {
    "name": "Pickle Rick",
    "description": "API test suite for Pickle Rick. Folders match the sheets in testing/test-cases/Pickle Rick Test Cases.xlsx - name each request after its Ref No (e.g. AUTH-01-001) so the mapping to the workbook stays traceable in both directions.\n\nRun with `npm test` from testing/postman. Do NOT run bare `newman run` - it skips teardown, and this suite is required to clean up after itself.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    { "name": "Smoke", "item": [] },
    { "name": "Auth", "item": [] },
    { "name": "Court Management", "item": [] },
    { "name": "Player Bookings", "item": [] },
    { "name": "Booking Acceptance", "item": [] },
    { "name": "Pasalo", "item": [] }
  ],
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "type": "text/javascript",
        "exec": [
          "// Mint one runId per run, on the first request that executes.",
          "//",
          "// Every account this suite registers is addressed as",
          "//   pm-{{runId}}-<role>@picklerick.test",
          "// which does three jobs at once (see decision D3 in the spec):",
          "//   1. teardown gets an unambiguous 'pm-%' handle and can never",
          "//      match a row a human created;",
          "//   2. concurrent runs get disjoint IDs and stop colliding on the",
          "//      users.email UNIQUE constraint;",
          "//   3. orphans from a crashed run still carry the prefix, so the",
          "//      next teardown sweeps them up.",
          "//",
          "// .test is reserved by RFC 2606 and can never resolve to a real",
          "// domain, so a test account can never email a real person.",
          "if (!pm.collectionVariables.get('runId')) {",
          "    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);",
          "    const rand = Math.random().toString(36).slice(2, 8);",
          "    pm.collectionVariables.set('runId', stamp + '-' + rand);",
          "}"
        ]
      }
    }
  ],
  "variable": [
    { "key": "runId", "value": "" },
    { "key": "authToken", "value": "" },
    { "key": "courtId", "value": "" },
    { "key": "bookingId", "value": "" }
  ]
}
```

These four are **collection** variables, not environment variables, on purpose: the Postman GUI can write an environment file back to disk, which is how a captured JWT ends up committed. Collection variables set at runtime never persist (D8, NFR-03).

- [ ] **Step 3: Write the committed example environment**

`testing/postman/environments/local.postman_environment.example.json`:

```json
{
  "name": "Pickle Rick - Local",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:4000",
      "type": "default",
      "enabled": true
    }
  ],
  "_postman_variable_scope": "environment"
}
```

- [ ] **Step 4: Create the real (gitignored) environment as a copy**

```bash
cd testing/postman && cp environments/local.postman_environment.example.json environments/local.postman_environment.json
```

Right now the two are identical, because `baseUrl` is not a secret. The split exists so that the first sanity folder needing a seeded account's password has a safe home already in place, rather than introducing the pattern in the same commit that first adds a password — which is exactly when it gets forgotten (D8).

- [ ] **Step 5: Add the ignore rules**

Append to `.gitignore`, below the existing Playwright credentials block:

```gitignore
# Newman (Postman) report output - regenerated every run, never committed.
testing/postman/newman/

# Real Postman environment - currently only baseUrl, but this is where seeded
# account passwords will live. Copy local.postman_environment.example.json to
# local.postman_environment.json on a fresh clone.
testing/postman/environments/local.postman_environment.json
```

- [ ] **Step 6: Verify the real environment file is ignored**

```bash
git status --short testing/postman/environments/
```

Expected: only `local.postman_environment.example.json` shows as untracked. If `local.postman_environment.json` appears, the ignore rule is wrong — fix it before committing, since this is the rule that will later protect a real password.

- [ ] **Step 7: Commit**

```bash
git add .gitignore testing/postman/PickleRick.postman_collection.json testing/postman/environments/local.postman_environment.example.json && git commit -m "[test]: add postman collection skeleton and environment template"
```

---

### Task 5: Newman run wrapper

**Files:**
- Create: `testing/postman/scripts/run.js`

**Interfaces:**
- Consumes: `require('./teardown')` → `{ teardown }` returning `{ ok, output }` (Task 3); the collection and environment paths (Task 4).

- [ ] **Step 1: Run the verification command and watch it fail**

```bash
cd testing/postman && npm test
```

Expected: `Cannot find module '.../scripts/run.js'`.

- [ ] **Step 2: Write `testing/postman/scripts/run.js`**

```js
#!/usr/bin/env node
// =============================================================================
// Newman run wrapper
// =============================================================================
// Why this exists instead of a plain `newman run` in package.json:
//
// CLAUDE.md requires this suite to clean up after itself, and prefers teardown
// built into the suite over relying on someone remembering. Chaining with &&
// fails exactly when it matters - it skips teardown when assertions fail - and
// chaining with ; still skips it if newman crashes outright. The runs that
// leave the most garbage behind would clean up the least.
//
// Driving newman through its Node API lets teardown live in a `finally`, so it
// runs on pass, on assertion failure, and on thrown exception alike.
//
// Known limitation: `finally` does not run on SIGINT, so Ctrl+C still leaves
// rows behind. That is why `npm run teardown` stays separately callable, and
// why the pm- prefix makes cleanup retroactive - the next run sweeps orphans.

const fs = require('fs');
const path = require('path');
const newman = require('newman');

const { teardown } = require('./teardown');

const SUITE_ROOT = path.resolve(__dirname, '..');
const COLLECTION = path.join(SUITE_ROOT, 'PickleRick.postman_collection.json');
const ENVIRONMENT = path.join(SUITE_ROOT, 'environments/local.postman_environment.json');
const REPORT = path.join(SUITE_ROOT, 'newman/report.html');

// Same guard style as testing/playwright/config/credentials.ts - fail with an
// actionable message rather than letting newman report a confusing parse error.
if (!fs.existsSync(ENVIRONMENT)) {
    console.error(
        `Missing ${ENVIRONMENT}.\n` +
        'Copy environments/local.postman_environment.example.json to ' +
        'environments/local.postman_environment.json before running the suite.'
    );
    process.exit(1);
}

function runNewman() {
    return new Promise((resolve, reject) => {
        newman.run(
            {
                collection: COLLECTION,
                environment: ENVIRONMENT,
                reporters: ['cli', 'htmlextra'],
                reporter: {
                    htmlextra: {
                        export: REPORT,
                        title: 'Pickle Rick - API Test Report',
                        browserTitle: 'Pickle Rick - Newman',
                    },
                },
            },
            (err, summary) => (err ? reject(err) : resolve(summary))
        );
    });
}

async function main() {
    let failed = false;

    try {
        const summary = await runNewman();
        failed = summary.run.failures.length > 0;
    } catch (err) {
        failed = true;
        console.error(`\nNewman could not complete the run: ${err.message}`);
    } finally {
        console.log('\n--- Teardown ---');
        const { ok, output } = teardown();
        console.log(output);
        // A failed teardown leaves rows in the dev database, which violates the
        // cleanup rule just as surely as a failed assertion violates a spec.
        // Fail the whole command so it cannot be quietly ignored.
        if (!ok) {
            failed = true;
        }
    }

    process.exit(failed ? 1 : 0);
}

main();
```

- [ ] **Step 3: Run it and verify green**

```bash
cd testing/postman && npm test; echo "EXIT: $?"
```

Expected: Newman's CLI summary showing 0 requests executed, then the `--- Teardown ---` banner with seven `DELETE 0` lines, exit 0.

If Task 1 found that Newman errors on an empty collection, this is where that shows up — do not paper over it by ignoring the exit code.

- [ ] **Step 4: Verify the missing-environment guard**

```bash
cd testing/postman && mv environments/local.postman_environment.json /tmp/env.bak && npm test; echo "EXIT: $?"
```

Expected: the "Copy environments/…example.json" message, exit 1. Then restore:

```bash
cd testing/postman && mv /tmp/env.bak environments/local.postman_environment.json
```

- [ ] **Step 5: Verify the working tree is clean**

```bash
git status --short
```

Expected: `scripts/run.js` untracked, and **nothing else** — no `newman/` report directory, no environment file (spec acceptance criterion 5). If the report shows up as untracked, Task 4's ignore rule is wrong.

- [ ] **Step 6: Commit**

```bash
git add testing/postman/scripts/run.js && git commit -m "[test]: run newman via node API so teardown always executes"
```

---

### Task 6: Documentation

**Files:**
- Create: `testing/postman/README.md`
- Modify: `CLAUDE.md` (§ Testing, the Postman line)
- Modify: `docs/roadmap.md` (§2 Testing, the Postman bullet)

- [ ] **Step 1: Write `testing/postman/README.md`**

````markdown
# Postman / Newman Suite

API tests for Pickle Rick, run headless via Newman. Folders mirror the
sheets in `testing/test-cases/Pickle Rick Test Cases.xlsx`.

> **Status:** scaffolding only. Every folder is currently empty — requests
> land on follow-up branches, starting with the Smoke folder.

## Setup

The Docker stack must be running (`docker compose up --build` from the
repo root, in its own terminal).

```bash
cd testing/postman
npm ci
cp environments/local.postman_environment.example.json environments/local.postman_environment.json
```

## Running

```bash
npm test
```

Runs the collection and then **always** runs teardown — including when
assertions fail.

**Do not run bare `newman run`.** It skips teardown, which breaks the
cleanup rule in `CLAUDE.md`.

If you kill a run with Ctrl+C, teardown is skipped (a `finally` block does
not survive SIGINT). Clean up by hand:

```bash
npm run teardown
```

This is also safe to run at any time — it only ever deletes rows matching
the test prefix below.

## Test data convention

Every account this suite registers is addressed as:

```
pm-{{runId}}-<role>@picklerick.test
```

`runId` is minted once per run by the collection's pre-request script. The
`pm-` prefix is what teardown keys off, so **any row a test creates must
carry it** — otherwise cleanup will not find it, and the row stays in your
dev database forever.

`.test` is a reserved TLD (RFC 2606), so these addresses can never reach a
real inbox.

## Adding a request

1. Find the case in `testing/test-cases/Pickle Rick Test Cases.xlsx`.
2. Name the request after its `Ref No` (e.g. `AUTH-01-001`), and put it in
   the folder matching that sheet.
3. Fill in the row's `Automation Script` column with the collection folder
   and request name, so traceability works in both directions.
4. Address any account it creates using the prefix above.
5. Capture runtime values with `pm.collectionVariables.set(...)` — never
   into the environment, which can be written back to disk and committed.

## Teardown and the schema

`scripts/teardown.js` deletes child tables before parents rather than
relying on `ON DELETE CASCADE`, because `order_items.item_id` is
`ON DELETE RESTRICT` and would abort a cascade from `users` once the
purchasing feature (BR-07) ships.

**If you add a table to `db/schema.sql` that test data can reach, add a
delete for it here.** `ON_ERROR_STOP=1` means a schema mismatch fails
loudly rather than silently leaving rows behind.

Full rationale:
[`docs/specs/2026-08-08-postman-newman-scaffolding-design.md`](../../docs/specs/2026-08-08-postman-newman-scaffolding-design.md)
````

- [ ] **Step 2: Update the Postman line in `CLAUDE.md`**

Find, under `## Testing`:

```markdown
- Postman: `newman run testing/postman/PickleRick.postman_collection.json`
  (stack must be running)
```

Replace with:

```markdown
- Postman: `cd testing/postman && npm test` (stack must be running). Runs
  the collection through `scripts/run.js`, which always executes teardown
  afterwards — a bare `newman run` skips cleanup and breaks the rule below.
```

This is a correctness fix, not a style change: as written, the file
instructs a reader to run a command that violates the cleanup rule stated
further down the same section (D6).

- [ ] **Step 3: Update `docs/roadmap.md`**

In §2 under "Testing — nothing exists yet", replace:

```markdown
- [ ] Postman collection + environment (smoke/sanity) with a cleanup
  request/folder at the end
```

with:

```markdown
- [x] Postman scaffolding: `testing/postman/` npm project, collection
  skeleton, environment template, and teardown (`test/postman-initial-setup`)
- [ ] Postman smoke folder — health, register, login, `/me`, and a 401
  check (`test/postman-smoke`)
- [ ] Postman sanity folders, one per workbook sheet
```

Leave the stale Playwright entries in that section alone — correcting them
is a separate `docs/` change and is deliberately not bundled here (spec §7).

- [ ] **Step 4: Verify no stale bare-newman references remain**

```bash
grep -rn "newman run" --include="*.md" . | grep -v node_modules | grep -v docs/specs | grep -v docs/plans
```

Expected: no hits outside `testing/postman/README.md`'s explicit
"do not run bare `newman run`" warning.

- [ ] **Step 5: Commit**

```bash
git add testing/postman/README.md CLAUDE.md docs/roadmap.md && git commit -m "[docs]: document postman suite setup and fix cleanup-bypassing run command"
```

---

### Task 7: Full-branch verification

Re-run every spec acceptance criterion end to end, on a clean checkout, before the branch is considered done.

- [ ] **Step 1: Verify a clean-clone install works**

```bash
cd testing/postman && rm -rf node_modules && npm ci && node -e "console.log(require.resolve('newman'))"
```

Expected: install succeeds from the lockfile alone; Newman resolves inside `testing/postman/node_modules/`.

- [ ] **Step 2: Run the suite**

```bash
cd testing/postman && npm test; echo "EXIT: $?"
```

Expected: 0 requests, teardown reports seven `DELETE 0`, exit 0.

- [ ] **Step 3: Confirm the tree is clean**

```bash
git status --short
```

Expected: completely empty. No report output, no environment file, no stray artifacts.

- [ ] **Step 4: Confirm no secret was committed anywhere on the branch**

```bash
git diff qa...HEAD -- . | grep -inE "password|token|secret" | grep -v "^-"
```

Expected: only documentation prose about *where* passwords will live — no actual values.

- [ ] **Step 5: Confirm the collection opens in the Postman GUI**

Import `testing/postman/PickleRick.postman_collection.json` into the Postman desktop app. Expected: all six folders present, four collection variables listed with empty values, the pre-request script visible at collection level.

This is manual, and worth doing once: `run.js` and the GUI parse the collection file differently, and a file Newman accepts can still be malformed for the GUI you will author requests in.

- [ ] **Step 6: Merge to `qa`**

Per `CLAUDE.md`, merges are manual while no CI pipeline exists.

```bash
git checkout qa && git merge --no-ff test/postman-initial-setup && git push origin qa
```

---

## Self-review

**Spec coverage:**

| Spec item | Task |
| --- | --- |
| D1 Newman as devDependency | 2 |
| D2 Layout mirrors playwright | 2, 4, 5 |
| D3 `runId` convention | 4 (script), 6 (documented) |
| D4 psql teardown | 3 |
| D5 Ordered deletes | 3 |
| D6 `run.js` wrapper + CLAUDE.md fix | 5, 6 |
| D7 Stubbed folders | 4 (validated by 1) |
| D8 Secret handling | 4 |
| Acceptance 1 (`npm ci`) | 7 step 1 |
| Acceptance 2 (`npm test` exits 0) | 5 step 3, 7 step 2 |
| Acceptance 3 (teardown `DELETE 0`) | 3 step 4 |
| Acceptance 4 (readable failure) | 3 step 5 |
| Acceptance 5 (clean tree) | 5 step 5, 7 step 3 |
| Acceptance 6 (GUI opens) | 7 step 5 |
| Risk: unverified empty-collection behaviour | 1 |
| File manifest — all 8 new, 3 modified | 2, 3, 4, 5, 6 |

No gaps.

**Type consistency:** `teardown()` is defined in Task 3 returning `{ ok, output }` and consumed in Task 5 destructuring exactly `{ ok, output }`. `TEST_EMAIL_PATTERN` (`pm-%@picklerick.test`) in Task 3 matches the `pm-` prefix minted in Task 4's script and documented in Task 6. Script names `test` / `teardown` are consistent across Tasks 2, 3, 5, 6, 7.

**Placeholders:** none — every code step contains complete file content.
