# Playwright

Run locally headed so browser automation remains observable. CI uses headless
mode. All E2E and live lifecycle checks require a **disposable test database
with no real accounts**. Never point this suite at production or a database
holding real development accounts. `PW_ALLOW_DISPOSABLE_DB=1` is the operator's
explicit confirmation; neither `CI=true` nor a test email suffix proves that
the database is safe.

## Run

From this directory, install with `npm ci` and install browsers with
`npx playwright install chromium firefox webkit` if missing. Start the stack
attached in a separate terminal. To isolate its database from the default
development project, run from the repository root:

```powershell
docker compose -p pickle-rick-pr122 up --build postgres backend-node frontend
```

Only one local stack can use ports 4000/5173/5432. Confirm the selected project
is the one serving these ports before opting in. An isolated project has its
own database volume; avoid resetting or deleting existing volumes.

```powershell
npm run test:safety
npm run typecheck
./scripts/run-court-tests-local.ps1 -All -DisposableDatabase
```

The runner reads `credentials.example.json` as templates, preserves the private
`credentials.json` byte-for-byte by never writing it, and restores its environment
overrides. For direct CLI runs:

```powershell
$env:PW_ALLOW_DISPOSABLE_DB = '1'
$env:PW_CREDENTIALS_FILE = "$PWD/credentials.example.json"
$env:PLAYWRIGHT_HTML_OPEN = 'never'
npx playwright test --headed
```

`PW_CREDENTIALS_FILE` is optional; without it setup reads the private
`credentials.json`. Addresses are templates only: setup substitutes a unique
`pw-<group>-<key>-<run UUID>@picklerick.test` alias. The `none` account remains
unregistered. Original template addresses are never logged in to or deleted.

## Ownership and cleanup (PR-122)

Setup writes `.runs/run-*/ownership.json` and passes its path to workers through
`PW_RUN_MANIFEST`. Each successful HTTP 201 registration is recorded with its
ID, creation token, role and disposable password before the next registration.
An existing-account response aborts setup; it never transfers ownership.
Partial setup is rolled back immediately.

Teardown reads only that run's ownership list. It verifies the token still
identifies the recorded ID/email/role, then uses password-confirmed
`DELETE /api/auth/me` (BR-08, FR-12, UC-06). Players are deleted before admins;
the backend transaction handles dependent bookings, Pasalo requests, courts,
inventory and orders. Cleanup attempts remaining accounts after one fails,
fails the run visibly, and retains unresolved entries. Missing ownership never
falls back to configured credentials. Completed manifests are removed.

The manifest contains disposable secrets. It is gitignored and created with
restrictive file mode where supported; Windows access follows local ACLs.
Do not commit, publish, or attach its contents. Keep the example/template data
disposable too, even though original addresses are not used.

## Interrupted-run recovery

Ordinary test failures still reach global teardown. A hard process kill,
power loss, or lost registration response cannot guarantee automatic cleanup.
No later run adopts accounts by matching their email. Inspect retained
manifests and the disposable database explicitly. An account created by the
server before a lost response/disk write may need manual investigation.

To retry cleanup for one known manifest on its original disposable stack:

```powershell
$env:PW_ALLOW_DISPOSABLE_DB = '1'
$env:PW_RECOVER_MANIFEST = 'C:/Projects/pickle-rick/testing/playwright/.runs/run-REPLACE/ownership.json'
npm run test:lifecycle -- --grep 'recover explicitly'
Remove-Item Env:PW_RECOVER_MANIFEST
```

Expired tokens or identity mismatches stop deletion and retain evidence. Resolve
the exact recorded account ID manually rather than deleting by email prefix or
resetting the database.

## Validation and future specs

See [PR-122 validation](../../docs/verification/2026-11-05-PR-122-validation.md)
for live sentinel/collision checks, repeated headed runs and SQL cleanup checks.
`npm run test:lifecycle` exercises the real API/database; `test:safety` replaces
only HTTP and private template input to test failure paths without a database.

Specs continue importing `test` from `fixtures/base` and credentials from
`config/credentials`. Create data under run-owned identities. The existing
booking regression spec retains its own per-test cleanup; unifying that into
shared test-scoped fixtures is PR-42, which remains separate.
