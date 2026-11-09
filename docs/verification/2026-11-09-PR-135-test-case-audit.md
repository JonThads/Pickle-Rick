# PR-135 — Test case spreadsheet audit

Dated snapshot, 2026-11-09. Branch `docs/PR-135-test-case-refresh`.
Jira: [PR-135](https://pickle-rick.atlassian.net/browse/PR-135); defect found: [PR-136](https://pickle-rick.atlassian.net/browse/PR-136).

## Environment

- Isolated Docker Compose project `pickle-rick-pr135`, volume `pickle-rick-pr135_pgdata` (fresh, empty), ports 127.0.0.1:4000 / 5173 / 5432.
- The normal `pickle-rick` dev stack was stopped (not removed) for the run because the tests are bound to those ports. Its volume was not touched.
- Playwright run headed via `scripts/run-court-tests-local.ps1 -All -DisposableDatabase`.

## Results

| Check | Result |
| --- | --- |
| Full headed suite (11 tests × chromium, firefox, webkit) | 33 passed, exit 0, 1.9 minutes |
| Database after the run | 0 users, 0 courts, 0 bookings, 0 Pasalo rows |
| API probes (disposable accounts, all deleted afterwards) | See below; database empty afterwards |

### Probes

| Probe | Observation | Effect on test cases |
| --- | --- | --- |
| Davao Player lists courts with `?location=Manila` | 200, the Manila court is returned | COURT-04-001 FAIL, defect PR-136 |
| Davao Player books the Manila court | 201, booking created as pending | COURT-04-002 FAIL, defect PR-136 |
| Player re-requests a slot after the Admin rejected it | 201, new pending request; the cancelled row remains | ACC-02-001 expected result confirmed |

## Spreadsheet changes

- 18 cases added (Auth 8, Court Management 3 incl. the two failing ones, Inventory 3 as a new sheet, Player Bookings 1, Booking Acceptance 1, Pasalo 2); the former `BUG-12/13/15` regression rows now live under their modules.
- Stale wording fixed; COURT-02-001 corrected from FAIL to PASS (fixed by PR-14).
- `ACC-03-001` rewritten to the owner's decision (several pending requests; Admin chooses) and mapped to `BUG-15-001`.
- Status, Remarks and Automation Script filled for every row.

## Not covered

- Cases marked Not started were not executed; only the cases listed above were run or probed.
- The Register page, Profile Settings and account deletion UI flows, inventory UI, Player booking UI flows and Pasalo UI flows have no automation yet.
- `tests/booking-acceptance.spec.ts` is an empty untracked placeholder.
