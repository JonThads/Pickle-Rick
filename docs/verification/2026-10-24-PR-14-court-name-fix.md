# PR-14 — Local Court Management Verification

Date: 2026-10-24 (Asia/Singapore)
Branch: `fix/PR-14-unique-court-names`
Delivery state: local verification; awaiting the user's review before any push.

## Change and scope

Business Rules, Admin Rules / UC-03 require unique court names within an
admin's account. PostgreSQL now enforces `(admin_id, name)` with
`idx_courts_admin_name`. The error handler maps that specific violation to
HTTP 409 with a readable court-specific message. No pre-insert lookup is
needed, so concurrent requests cannot both succeed.

Names use their stored spelling; this change does not introduce trimming or
case-insensitive matching. Different admins may still use the same name.

The existing PR-38 test commit is included locally so the fix can be reviewed
with the original regression assertion intact. The open test PR has not been
updated or merged as part of this local verification.

## Executed verification

- Before the fix: `COURT-02-001` failed in headed Chromium because no duplicate
  error appeared after creating a second court with the same name.
- After the fix: all 24 existing Playwright executions passed headed, with
  one worker, across Chromium, Firefox, and WebKit. This includes all nine
  executions of the three Court Management cases.
- API acceptance probes passed: same-admin duplicate returns 409 with a
  court-specific error; different-admin reuse returns 201; concurrent creates
  return one 201 and one 409 and leave exactly one court for that name.
- TypeScript compilation and JavaScript syntax checks passed.
- The reusable local runner also passed all nine Court Management executions;
  the private credential file was verified restored byte-for-byte afterward.
- Post-run database checks found zero users, courts, bookings, and items in
  this isolated project. All six Docker services remained running.

The current Court Management specs cover admin-side court creation, displayed
details, and duplicate rejection. The workbook's player-side court visibility
expectation is still a manual review step; these results do not establish
complete automation of every workbook expectation.

## Local environment

Docker runs attached in a visible PowerShell terminal under Compose project
`pickle-rick-pr14`, using the normal ports from `docker-compose.yml`:

- App: <http://localhost:5173>
- API: <http://localhost:4000>
- pgAdmin: <http://localhost:5050>

This project was created with fresh, separate database volumes. The empty
baseline test database was recreated after the schema edit; existing
`pickle-rick_pgdata` and `pickle-rick_pgadmin-data` volumes were preserved.
The stack stays running for personal review.

For an existing database, editing the init SQL alone does not apply the new
index: Postgres runs initialization only when its data directory is empty.
The project's reset procedure is `docker compose down -v` followed by
`docker compose up --build`, but that deletes data. Preserve any intentional
data before adopting a reset. This verification did not reset the user's
original development database or alter its schema directly.

## Personal review

1. Open the app and register an admin for your own review.
2. Create an auto-approval court and a manual-approval court with different
   names; check their details under **Your courts**.
3. Submit a second court using that admin's existing court name. Expect an
   error explaining that the name already exists, with only one matching card.
4. Optionally register a different admin and reuse the name; it should succeed.
5. As a player browsing Davao, check that the courts created in Davao appear
   under **Find a court**.

To watch only the existing Court Management tests again, run from the repo root:

```powershell
powershell -NoProfile -File .\testing\playwright\scripts\run-court-tests-local.ps1
```

Pass `-Project chromium` (or `firefox` / `webkit`) to watch a single browser.
The runner uses disposable example credentials for the duration of the run and
restores the developer's credential file afterward. Global teardown removes
the test accounts and their courts. Keep personal review accounts distinct
from the `pw-` example accounts, which belong to the automated suite.

To open the latest generated report:

```powershell
cd testing/playwright
npx playwright show-report
```

## Next gate

The user must confirm the local result before pushing. Subsequent integration
must still follow PRs into `qa`, passing QA checks, then a `qa` → `main` PR
with all required Main checks. Local passes do not establish remote CI passes
or Jira completion; no Jira records were changed.
