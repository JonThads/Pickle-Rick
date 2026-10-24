# PR-12, PR-13, PR-15, PR-16 verification

Date: 2026-10-24 (Asia/Singapore). Branch: `fix/PR-12-booking-defects` from `origin/qa`.

## Changes

| Ticket | Result | Requirement |
| --- | --- | --- |
| PR-12 | Shared court-ownership helper for inventory and booking controllers. Foreign admins receive 403 for booking list, approval and cancellation; players can still cancel their own bookings. | BR-05, NFR-03 |
| PR-13 | Controller rejects approved-slot requests. Creation locks the court and repeats the slot guard before insertion, including duplicate requests by the same player. Competing pending requests remain allowed. | FR-06, NFR-01 |
| PR-15 | Approval and cancellation of pending competitors use one checked-out client and transaction, with rollback and release on failure. Approval takes the same court lock as creation. | UC-05-02 Admin, NFR-01 |
| PR-16 | Orders default to placed, matching CHECK; the schema comment documents placed to picked_up/cancelled. No purchasing endpoints added. | BR-07 |

The court lock serializes writes per court, including different slots. This is
deliberately simple for a local application. The approved-only partial index
remains unchanged. The unresolved initial-booking pending-request rule is
preserved as instructed by CODEX-INSTRUCTIONS; Pasalo is separate and unchanged.

## Executed verification

- Before fixes: the real Docker API returned 200 for all three foreign-admin
  operations, accepted a request on an approved manual slot, and accepted
  duplicate concurrent pending submissions. A create/approve race left a pending
  row behind. An injected SQL error between approval and cancellation left
  the first update committed. An order insert without status failed CHECK.
- After fixes: `docker compose -p pickle-rick-defects exec -T backend-node npm test`
  passed all 12 API/database regressions on a fresh database. Includes legitimate
  owner/player cases, missing resources, pending competitors, approved conflicts,
  simultaneous submissions/approvals, creation versus approval, and rollback
  after a real division-by-zero SQL error. The concurrent HTTP checks use
  Promise.all and are not an exhaustive exploration of all possible schedules.
- New headed Chromium regressions: 3/3 passed. They exercise the real UI/API:
  foreign court access, stale availability rejected with 409, and approval of
  one of two pending requests with cancellation of its competitor.
- Full headed cross-browser run: 22 passed, 11 failed (8.2 minutes).
  Chromium: 11/11 passed. WebKit: 10/11 passed, including all three bug
  regressions; AUTH-03-001 failed during login because the click target was
  reported outside the viewport. Firefox: BUG-12-001 passed; AUTH-01-001,
  AUTH-01-002, AUTH-02-001, AUTH-03-001, AUTH-03-002, BUG-13-001,
  BUG-15-001, COURT-01-001, COURT-01-002 and COURT-02-001 timed out.
  Firefox diagnostics reproduced a mouse click stalling before any login
  request; keyboard Enter submitted successfully and rendered the API error.
  Software-rendering preferences did not resolve it. These are unresolved
  local browser interaction limitations; they are not recorded as passes.
  No browser assertions, interaction checks, or CI gates were disabled.
- Postman: 24 requests and 42 assertions passed. Initial teardown used the
  default Compose project and failed; reran scoped cleanup and the entire suite
  with `COMPOSE_PROJECT_NAME=pickle-rick-defects`, successfully removing test rows.
- TypeScript compilation, changed JavaScript syntax, frontend production build,
  and whitespace checks passed. No configured ESLint suite exists.
- Fresh-context review found no blocking findings. Browser approval was scoped
  to the intended player's row rather than relying on unspecified row ordering.

## Local setup and cleanup

Docker runs attached in a visible PowerShell terminal under Compose project
`pickle-rick-defects`, on the standard localhost ports. After the pre-fix run,
the isolated database contained zero users, courts, bookings and orders. Only
this empty project's volumes were recreated to verify PR-16 from `db/schema.sql`.
Original `pickle-rick` and `pickle-rick-pr14` data volumes were preserved.

Backend tests use unique disposable accounts and delete them after each test.
Browser regressions have afterEach cleanup. The headed runner temporarily uses
example credentials and restores the original private file in finally; Postman
was run with equivalent environment-file preservation. The workbook adds
BUG-12-001, BUG-13-001 and BUG-15-001 and their automation-script mappings without
marking existing workbook manual cases complete. PR-16 has no UI or checkout
endpoint, so its acceptance test is an actual SQL insert into the fresh schema.

Commands:

```powershell
docker compose -p pickle-rick-defects exec -T backend-node npm test
powershell -NoProfile -File testing/playwright/scripts/run-court-tests-local.ps1 -All
$env:COMPOSE_PROJECT_NAME = 'pickle-rick-defects'
cd testing/postman
npm test
```

The backend regression suite is now part of the reusable QA/Main workflow.

## Integration

PR-14 was independently confirmed merged in GitHub #14 (qa) and #15 (main),
then transitioned Done in Jira with evidence comment 10070.

The four remaining fixes require a passing qa PR followed by a passing qa-to-main
PR. Live inspection found qa has no classic branch protection; main requires
the suite, Docker-image build, and secrets-scan checks with strict base freshness.
We still require a green QA workflow before the qa merge. Merge evidence will
be reported from GitHub, not inferred from local tests.

Existing database volumes do not automatically rerun init SQL. This work verifies
the changed source against a fresh separate database; it does not migrate or
reset the user's original database.
