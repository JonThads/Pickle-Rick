# PR-35 Postman Collection Implementation Plan

**Goal:** Complete the existing smoke/sanity collection against every currently mounted business endpoint, including the negative cases in Jira PR-35, and leave no test data or uploaded files behind.

**Architecture:** Keep the importable Postman v2.1 JSON and existing Newman runner. Use disposable run-specific accounts and runtime passwords/tokens. End the collection with API account deletion; retain SQL teardown as a failure fallback, scoped to this Compose project. No application or schema changes.

**Tech Stack:** Postman v2.1, Newman, Node.js, Docker Compose, PostgreSQL.

**Spec:** Jira PR-35 (read 2026-10-24), existing scaffolding design, BR-01–BR-08, FR-01–FR-08/FR-10/FR-12, NFR-03, UC-01–UC-06.

## Findings before implementation

- Current `origin/qa` base: `3d8eec0`; working tree clean. Existing collection: 24 requests, initial Auth/Court coverage and one auto booking. Booking Acceptance, Pasalo, Items and Smoke are empty.
- Missing assertions exist in initial requests; two admin emails and test passwords are static. README incorrectly says the collection is empty.
- PR-56 API versioning is not implemented. Use actual `/api` mounts; do not implement PR-56 here.
- Preserve the documented unresolved multiple-pending-bookings ambiguity; test one manual request and approved-slot rejection without deciding that policy.

## Plan

- [x] Add an offline coverage check: discover mounted API routes, require a request per method/path and explicit status/shape tests on every request. Observe it fail on the incomplete collection.
- [x] Complete/normalize Auth and Courts; add real multipart photo upload and fetch, role and missing-input negatives, runtime credentials, unique run state.
- [x] Add booking create/list/approve/cancel, availability state assertions, role/ownership and approved-slot regressions.
- [x] Add Pasalo incoming/outgoing, approval/rejection, foreign responder, seven accepted joiners plus owner, rejection of an eighth joiner and of approving a queued extra request.
- [x] Add inventory CRUD and foreign-admin/player rejection, assert persistence after forbidden mutations.
- [x] Add final API cleanup folder for all accounts and revoked-token checks. Make Newman use the collection directory for the fixture and remove uploaded test files even after API account deletion. Keep SQL fallback and verify no test rows/files remain.
- [x] Run offline checks and Newman against visible attached Docker, repeat to prove isolation, exercise failure cleanup, refresh README/status docs, review diff, commit and push `test/PR-35-postman-collection`.

## Review focus

- A rerun must not reuse exported tokens, account emails, dates or IDs.
- Failed assertions must not bypass cleanup; cleanup failure must fail the command.
- Cleanup must resolve this repository's Compose project, regardless of shell cwd.
- Photo files outlive API account deletion and require explicit, narrowly scoped removal.
- The eight-player boundary includes the owner; test both join and approval boundaries.

## Execution record

Implementation and push are explicitly authorized in the user request. Execute in this session and record actual checks in `docs/verification/2026-10-24-PR-35-postman.md`.

Execution ruling: the expanded collection reproduced a real FR-08 rejection defect (SQLSTATE 22001). Widening only booking_players.status to VARCHAR(11) is included to meet the authorized green-suite outcome; existing databases are not modified directly. Verification records two green full runs, one deliberate-failure cleanup run and 12 backend passes.

Final review (2026-10-25): one P2 failed-upload cleanup finding fixed. The uploader ID is recorded before upload; two new tests failed before the change and passed afterward. Final `npm test`: nine harness tests, 147 requests, 366 assertions, zero failures. Database/file cleanup verified; no deferred findings. See the verification record for the resumed run.

