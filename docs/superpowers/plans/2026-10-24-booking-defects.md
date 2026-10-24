# Remaining defects implementation plan

**Goal:** Complete PR-12, PR-13, PR-15 and PR-16, verify locally against Docker, then merge through gated PRs into qa and main.

**Architecture:** Express controllers authorize and enforce business rules; raw SQL models own transactions on dedicated pool clients. Serialize booking creation and approval on the court row so an approval cannot race a new pending insertion. Keep the partial approved-slot unique index.

**Scope:** Jira acceptance criteria for PR-12/13/15/16; BR-03/04/05/07, FR-03/04/06, NFR-01/03, UC-05-02 (Admin). Preserve the unresolved competing-pending behavior as instructed in CODEX-INSTRUCTIONS. Orders begin placed, then become picked_up or cancelled; no purchasing endpoints added.

**Execution:** The user authorized implementation, visible local testing, Jira PR-14 completion and promotion through qa/main. Work in the current codebase on fix/PR-12-booking-defects from origin/qa, using separate attributable commits. No additional worktree needed for this clean checkout.

## Tasks

- [x] Verify PR-14 merges and update Jira to Done with evidence.
- [x] Add real Docker API/database regressions; run before fixes and record failures.
- [ ] PR-12: extract shared loadOwnedCourtOr403(req, res, courtId) into backend-node/src/utils/courtOwnership.js; reuse in item/booking controllers. Assert cross-admin list/approve/cancel 403, owner success, player cancellation unchanged, missing resources 404.
- [ ] PR-13: model transaction for booking creation locks court, rechecks slot; controller maps approved or duplicate-active decisions to 409. Assert manual and auto conflicts, competing pending success, equivalent numeric hour input and creation/approval concurrency.
- [ ] PR-15: approveBookingAndCancelOthers(bookingId) uses one client, court lock, BEGIN/COMMIT/ROLLBACK/finally release. Assert competitor cancellation, simultaneous approval conflict, and real rollback after injected SQL failure between updates.
- [ ] PR-16: change orders default to placed in db/schema.sql and document lifecycle. Fresh isolated Docker database must accept omitted status and reject invalid status.
- [ ] Add headed UI regression coverage using existing Playwright fixtures and disposable data. Keep workbook mappings consistent where cases exist; backend-only cases use ticket IDs.
- [ ] Run full headed Playwright and Postman, integration suite, syntax/type/build checks; confirm test cleanup and credential restoration. Record actual results and limitations in docs/verification and update status docs.
- [ ] Review final diff, push fix branch, create and attach qa PR, wait for required checks and merge. Create and attach qa-to-main PR, wait for required checks and merge. Verify remote merge metadata.

## Review focus

- Authorization derives exclusively from verified JWT and database court ownership.
- Creation and approval take locks in the same order; no pending request can arrive after approval.
- Rollback removes both effects when competitor cancellation fails.
- Pending competitors still coexist; Pasalo is separate and unchanged.
- Existing developer volumes and private credential files remain preserved; fresh schema verification uses a separate Compose project.

## Evidence ledger

- Initial checkout clean on the already-merged PR-14 fix branch. Created fix/PR-12-booking-defects from refreshed origin/qa.
- PR-14 transitioned Done with comment 10070, citing GitHub #14 and #15.
- Docker Desktop initially stopped; started it. Existing pickle-rick and pickle-rick-pr14 volumes will be preserved.
- PR-12/13/15/16 implemented in separate commits. All 12 real API/database regressions pass on fresh schema. SQL error injection proves rollback.
- Postman 24 requests / 42 assertions pass after scoped-project teardown correction. Full headed Playwright: 22 passed / 11 failed; Chromium 11/11, WebKit 10/11, Firefox 1/11. All three new UI regressions pass Chromium and WebKit. See verification report for exact failing cases and local diagnostic evidence.
- Fresh reviewer found no blocking issue; recommended deterministic race synchronization as an optional future improvement. Promise.all concurrency checks are not exhaustive schedule coverage.
- TypeScript, JS syntax, frontend build and diff checks pass. Workbook original values, tabs, validation lists and freeze panes preserved; new regression mappings appended.
