# Postman / Newman Suite

PR-35 smoke/sanity coverage for all **23 implemented business endpoints**:
147 requests and 366 assertions. Health, metrics and uploaded-file retrieval
are also exercised. The API currently mounts `/api`, not the planned `/api/v1`.
Purchasing and analytics endpoints do not exist yet and are outside this suite.

## Setup and run

Start the stack from the repository root with `docker compose up --build`
(attached so logs stay visible), then in another terminal:

```powershell
cd testing/postman
npm ci
Copy-Item environments/local.postman_environment.example.json environments/local.postman_environment.json
npm test
```

| Command | Purpose |
| --- | --- |
| `npm test` | Offline checks, Newman, then SQL/file cleanup even after assertion/startup failures |
| `npm run check` | Route coverage, assertion/state guards and nine runner/teardown tests; no stack needed |
| `npm run teardown` | Recover reserved Postman accounts and manifested uploads after interruption |

The environment contains only `baseUrl`. Accounts, passwords, JWTs, IDs,
test location and tomorrow's booking date are generated at runtime. Tokens
from **login** authenticate later requests. Exported collection variables
are empty. The ignored `newman/report.html` omits request/response bodies
and headers; it must still be treated as local test output.

If running a named Compose stack, select it explicitly. Its API URL and
database project must refer to the same stack:

```powershell
$env:COMPOSE_PROJECT_NAME = 'pickle-rick-pr35'
$env:POSTMAN_BASE_URL = 'http://localhost:4035'
npm test
```

`POSTMAN_BASE_URL` overrides the environment's URL without editing the file.
The runner checks that the selected Compose project's Postgres is running
before sending API requests. Cleanup resolves Compose from the repository
root; `COMPOSE_PROJECT_NAME` is inherited by Docker. This suite is intended
only for the local development stack, with disposable test accounts.

## Coverage and order

Run the **entire collection in order**, with one iteration. Individual
folders depend on accounts, tokens and resources created earlier.

| Folder | Coverage / requirement traces |
| --- | --- |
| Smoke | Health and Prometheus response contracts |
| Auth | Register/login for both roles, duplicate/invalid/missing input, unauthenticated access, profile update, multipart photo upload/retrieval, password-confirmed deletion and stale tokens (BR-01/02/08, FR-01/12, UC-01/02/06) |
| Court Management | Manual/auto creation, duplicate name, role checks, owned lists, location filter, 24-slot availability (BR-04/05, FR-02, UC-03) |
| Player Bookings | Auto/manual creation, duplicate own request, approved-slot conflict, missing input, own list, foreign cancellation rejection (BR-03/06, FR-03–06) |
| Booking Acceptance | Owner approval/cancellation, foreign-admin read/approve/cancel rejection and unchanged pending status, wrong-role rejection, approved-slot availability (BR-04/05, FR-04/06, UC-05-02) |
| Pasalo | Join, incoming/outgoing, foreign responder, acceptance/rejection, seven joiners plus owner, join and approval rejection at capacity (FR-07/08, Pasalo Rules) |
| Items | CRUD, foreign admin/player rejection, wrong-court item, unchanged stock after forbidden writes, persisted edits/deletion (BR-07, FR-10, UC-04) |
| Cleanup | Delete remaining accounts via API and verify tokens return 401; admin deletion cascades courts, bookings, join requests and inventory (BR-08, FR-12, UC-06) |

The multiple-pending-manual-booking requirement remains disputed in the source
docs; this suite does not decide it. It tests a single pending request and
rejection once approved. Sequential cap checks do not establish concurrent
Pasalo approval safety.

## Cleanup and isolation

Emails use `pm-<UUID>-<account>@picklerick.test`. Reserve this namespace
for automated tests. Normal Newman runs scope SQL fallback to **their UUID**;
standalone recovery sweeps the reserved namespace, so do not run recovery
while another Postman run is active. Children are deleted before parents
to respect `order_items.item_id`'s `ON DELETE RESTRICT` constraint.

Photo upload uses `fixtures/avatar.svg`. Before upload, the runner records the
disposable uploader ID in ignored `newman/uploads-<UUID>.json`. Cleanup removes
only SVG uploads belonging to that exact test user, including failed uploads.
Account deletion does not delete physical photo files. SQL and file cleanup
are both attempted; either failure makes `npm test` fail. No volume reset
or deletion of unrelated users/uploads is performed.

Ctrl+C/process termination can bypass `finally`. Run `npm run teardown` against
the same Compose project afterward. The manifest is written before
any upload, so recovery also handles failed or interrupted upload responses.

For Postman desktop, import the collection and example environment and set
the working directory to `testing/postman` so `fixtures/avatar.svg` resolves.
The final Cleanup folder removes database records, but Postman desktop cannot
delete server-side photo files. Use `npm test` for automatic file cleanup;
after a desktop run, remove the exact uploaded test file identified by `photoUrl`.
Bare `newman run` also bypasses the wrapper's failure/file cleanup.

## Schema note

PR-35 exposed that `booking_players.status VARCHAR(10)` cannot store the
11-character `disapproved` state. `db/schema.sql` now uses `VARCHAR(11)`.
Existing initialized databases retain the old column width. Verification used
a new isolated Compose database; use the project's agreed schema-update
process before expecting rejection tests to pass against an older database.
Do not reset a volume containing intentional data without authorization.
