# PR-123 Pasalo approval verification

Dated local verification snapshot: 2026-11-03 (Asia/Singapore).
Ticket: [PR-123](https://pickle-rick.atlassian.net/browse/PR-123).

## Behavior and implementation

- FR-08 / Pasalo Rules: the limit is seven approved joiners plus the owner.
- NFR-01: every response locks the parent booking before reading request state,
  counting approved joiners, and conditionally updating a pending request.
  All statements use one checked-out PostgreSQL connection. Other bookings
  can be processed independently.
- Controller authorization and business rules run inside the protected callback;
  the model owns SQL, commit/rollback, and connection release. HTTP success is
  sent only after commit succeeds.
- Only pending requests may become approved/disapproved. A repeat or reversal
  returns 409. Full capacity blocks approval, but still allows disapproval.
- Existing 403 ownership and 404 missing-request responses are retained.
- No schema migration, database reset, or frontend change.

## Executed checks

Target: local Docker Compose Express API and PostgreSQL 16, existing volumes.

| Check | Result |
| --- | --- |
| New integration regressions before implementation | Same-request concurrent decisions and terminal-state replay failed (both returned 200); ordinary last-seat race happened to pass on that run |
| `docker compose exec -T backend-node npm test` | 23 tests passed, zero failures; includes four new PR-123 tests |
| `docker compose exec -T backend-node node --test test/pasalo-approval.test.js` after strengthening concurrency proof | Four passed; both approvals observed waiting in PostgreSQL before the held booking lock was released |
| `npm test` in `testing/postman` | Nine harness tests passed; Newman executed 176 HTTP requests, 447 assertions, zero failures; exit 0 |

The SQL failure test executes the actual approval update, then injects division
by zero before commit. It verifies the request remains pending and a subsequent
approval succeeds, demonstrating rollback and lock release.

The Postman collection contains 174 top-level requests. Its concurrent test
issues two additional HTTP requests, checks exactly one approval succeeds, and
reads the resulting roster. This is bounded local regression evidence, not a
load/stability claim. No Playwright or k6 run was needed for this backend change.

## Cleanup and branch isolation

- Integration fixtures use exact disposable account IDs; deletion cascades their
  courts/bookings/join requests, and a database query confirms account absence.
- Newman API cleanup and its per-run SQL/file fallback completed successfully.
- A final database query found zero PR-123 or Postman test accounts remaining.
- User volumes were preserved. Services were started attached for verification
  and stopped afterward to restore their initial stopped state.
- Work starts from `origin/qa` on `fix/PR-123-atomic-pasalo-approval`.
  The pushed `docs/PR-134-documentation-structure` branch was left unchanged.
  It is not merged into the fix. Its documentation moves and independently
  created changelog will need normal reconciliation when both branches merge.

## Follow-up verification alongside the user's manual test

On 2026-11-03 the stack was started again and a separate disposable manual
booking was prepared with seven players including its owner and two pending
requests. The independent backend suite passed all 23 tests; Newman again
passed 176 HTTP requests and 447 assertions, with all nine harness tests passing.
Automated fixtures were torn down. The user reported that manual verification
passed and authorized integration/promotion. The ten manual accounts and their
cascading fixtures were then deleted; a database query confirmed zero matching
accounts remaining. Branch integration and promotion are tracked by the live
pull requests, rather than inferred from this local verification snapshot.
