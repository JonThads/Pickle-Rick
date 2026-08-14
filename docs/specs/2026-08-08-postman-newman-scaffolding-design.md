# Design Spec — Postman/Newman Suite Scaffolding

*Pickle Rick*

| | |
| --- | --- |
| **Date** | 2026-08-08 |
| **Branch** | `test/postman-initial-setup` (cut from `qa`) |
| **Status** | Approved — pending implementation |
| **Scope** | Scaffolding and configuration only. No requests, no assertions. |
| **Roadmap item** | §2 "Testing — nothing exists yet" → *Postman collection + environment* |

---

## 1. Why this branch exists

`CLAUDE.md` has documented the command
`newman run testing/postman/PickleRick.postman_collection.json` since before
any testing directory existed. `testing/playwright/` has since been built out,
but `testing/postman/` is still absent — so the documented command fails on a
fresh clone.

This branch creates that directory and everything needed to run a collection
against the local Docker stack. It deliberately stops before writing any
actual test content.

### Why scaffolding is its own branch

Splitting setup from test content is not ceremony — it isolates two kinds of
failure that are painful to debug together.

Scaffolding failures are environmental: newman can't resolve, the environment
file doesn't load, teardown can't reach the container, a path is wrong on
Windows. Test failures are semantic: an assertion is wrong, an endpoint
changed, a token wasn't captured.

If both land in one commit, every red result has two candidate explanations
and you bisect between them by hand. Landing scaffolding alone means that by
the time the first request is written, the plumbing underneath it is already
known-good, and any red result after that has exactly one class of cause.

The same reasoning is why `test/playwright-setup` preceded
`test/playwright-auth` in this repo's history. This branch mirrors that shape
for Postman.

---

## 2. Goals and non-goals

### Goals

- `testing/postman/` exists with a runnable, reproducible newman setup.
- Teardown is built and verified **before** anything exists that could
  create data — so the cleanup rule in `CLAUDE.md` is satisfied by
  construction rather than retrofitted.
- Conventions (test-data identity, secret handling, folder structure) are
  fixed and documented, so later branches add requests without re-deciding.
- A fresh clone can go from `git clone` to a successful run with two
  commands and no undocumented steps.

### Non-goals

Explicitly deferred, each to its own branch:

| Deferred | Goes to |
| --- | --- |
| Smoke folder requests + assertions | `test/postman-smoke` |
| Per-module sanity folders (Auth, Courts, Bookings, Pasalo) | one branch per module |
| GitHub Actions workflow that invokes newman | the CI/CD phase (roadmap §3.6) |
| `DELETE /api/auth/me` endpoint | a `feature/` branch (roadmap §2) |

---

## 3. Key decisions and rationale

### D1 — Newman as a local devDependency, not a global install

**Decision:** `npm install --save-dev newman newman-reporter-htmlextra` inside
`testing/postman/`, with a committed `package-lock.json`.

**Why:** newman 6.2.2 already resolves via `npx` on the current dev machine,
so a global install would appear to work today. That is exactly the trap. A
global install is invisible to the repo: nothing records which version ran,
a fresh clone silently gets whatever version is on that machine, and the CI
runner gets nothing at all. Pinning it as a devDependency makes the version a
reviewable fact in git and makes `npm ci` the single setup step for both a new
laptop and a GitHub Actions runner.

This also honours the lockfile-discipline item in
`docs/claude-instructions.md` § "Suggested standards not yet adopted".

### D2 — Directory layout mirrors `testing/playwright/`

**Decision:** `testing/postman/` gets its own `package.json`, its own
`node_modules`, and a `scripts/` + `environments/` split.

**Why:** the two suites have genuinely different dependency trees, and
hoisting them into one root package would couple a Playwright upgrade to the
Postman suite for no benefit. Keeping each suite self-contained means either
can be run, broken, or rewritten without touching the other. The cost —
two `node_modules` directories — is irrelevant locally and, in CI, is
actually an advantage, because the Postman job installs only what it needs.

### D3 — Run-scoped test identity via `runId`

**Decision:** a collection-level pre-request script mints a single `runId` per
run. Every account the suite ever registers is addressed as
`pm-{{runId}}-<role>@picklerick.test`.

**Why:** this one convention solves three problems that would otherwise each
need their own mechanism.

1. **Teardown gets an unambiguous handle.** Cleanup keys off the literal
   prefix `pm-`, so it is structurally incapable of deleting a row a human
   created. This matters more than it sounds: a teardown scoped by "recently
   created" or "rows this run touched" is one bug away from deleting real
   data, and the blast radius of that bug is the dev database.
2. **Concurrent runs stop colliding.** Two runs, or a run overlapping a
   Playwright suite, get disjoint `runId`s and cannot fight over the
   `users.email` UNIQUE constraint.
3. **A crashed run is recoverable.** Orphaned rows from a killed run still
   carry the `pm-` prefix, so the next `npm run teardown` sweeps them up.
   Cleanup is idempotent and retroactive rather than depending on any single
   run exiting cleanly.

The `.test` TLD is reserved by RFC 2606 precisely so it can never resolve to a
real domain — a test account can never accidentally email a real person.

### D4 — Teardown via `psql`, not via an API endpoint

**Decision:** `scripts/teardown.js` executes SQL through
`docker compose exec postgres psql`.

**Why:** `backend-node/src/routes/authRoutes.js` has no `DELETE` route, so
there is no API path to remove a registered user. That leaves three options,
and the reasoning for rejecting two is worth recording:

- *Add `DELETE /api/auth/me` first* — legitimate work (it is an open roadmap
  §2 item, and `ProfileSettings.jsx` already has a disabled button waiting for
  it), but it is a **destructive endpoint**, and designing one under
  test-cleanup pressure is how you get cascade semantics decided by accident.
  The roadmap explicitly notes it "needs a decision on cascade behavior
  (cancel bookings first, per the UI's own copy)". That decision deserves its
  own branch, not a footnote in test tooling.
- *Use only pre-seeded fixed accounts* — nothing to clean up, but registration
  itself (BR-01, BR-02, UC-01, UC-02) becomes permanently untestable via
  Postman, which removes a large share of the Auth sheet's coverage.
- *`psql` teardown* — keeps this branch purely test infrastructure, adds no
  production surface, and can clean up state no API endpoint would ever expose
  anyway (a half-written booking from a crashed run).

**Accepted trade-off:** teardown knows the schema, so a schema change can
break it. This is mitigated by `ON_ERROR_STOP=1`, which makes such a break
loud and immediate rather than a silent no-op that quietly leaves rows behind.

### D5 — Explicit ordered deletes, not the `users` cascade

**Decision:** teardown deletes from each table in reverse dependency order
inside one transaction, rather than issuing a single
`DELETE FROM users` and letting `ON DELETE CASCADE` do the work.

**Why:** the cascade appears sufficient and is not. `db/schema.sql` defines
`order_items.item_id` as `ON DELETE RESTRICT`, while `items.court_id` and
`courts.admin_id` are `ON DELETE CASCADE`. Deleting a test admin therefore
tries to cascade into `items` — and PostgreSQL cannot defer a `RESTRICT`
check, so the whole delete aborts with a foreign-key violation as soon as any
order line references one of those items.

No order endpoints exist yet (roadmap §2 lists purchasing as unbuilt), so this
cannot fire today. It fires on the first run after BR-07 ships. Writing the
ordered version now costs a few extra lines and removes a failure that would
otherwise surface as a confusing teardown error on an unrelated branch, months
from now.

Deletion order, children first:

```sql
BEGIN;

-- Every statement scopes to the same `pm-%` subquery, repeated inline.
-- A CTE would read better but cannot be shared: a WITH clause is scoped to
-- the single statement it prefixes, so it would have to be redeclared on
-- all seven DELETEs anyway.

DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE player_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
     OR court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'))
);

DELETE FROM orders WHERE player_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
   OR court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM booking_players WHERE player_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
   OR booking_id IN (SELECT id FROM bookings WHERE booked_by IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM bookings WHERE booked_by IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test')
   OR court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM items WHERE court_id IN (SELECT id FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test'));

DELETE FROM courts WHERE admin_id IN (SELECT id FROM users WHERE email LIKE 'pm-%@picklerick.test');

DELETE FROM users WHERE email LIKE 'pm-%@picklerick.test';

COMMIT;
```

Wrapping in a transaction means a partial failure rolls back rather than
leaving the database half-cleaned — the worst possible teardown state, since
it is neither clean nor reproducible.

### D6 — A `run.js` wrapper instead of the bare newman CLI

**Decision:** `npm test` invokes `scripts/run.js`, which drives newman through
its Node API and calls teardown in a `finally` block.

**Why:** `CLAUDE.md`'s cleanup rule says suites must clean up after
themselves, and prefers "teardown built into the suite itself over relying on
someone remembering to clean up by hand." A bare
`newman run … && node scripts/teardown.js` fails that on the exact runs where
it matters most: `&&` skips teardown when assertions fail, and `;` still skips
it when newman crashes. The runs that leave the most garbage behind are the
runs that would clean up least.

The Node API puts teardown in a `finally`, so it executes on pass, on
assertion failure, and on thrown exception alike.

**Known limitation, accepted:** `finally` does not run on `SIGINT`. A run
killed with Ctrl+C leaves rows behind. This is why `npm run teardown` stays
independently callable, and why D3's prefix scheme makes cleanup retroactive —
the next run's teardown sweeps up the previous one's orphans.

**Consequence outside this directory:** the `newman run …` line in
`CLAUDE.md` § Testing bypasses `run.js` entirely and therefore bypasses
teardown. Left as-is, the project's own documentation instructs a reader to
violate the project's own cleanup rule. This branch updates that line.

### D7 — Empty folders, stubbed to the workbook's sheets

**Decision:** the collection ships with `Smoke`, `Auth`, `Court Management`,
`Player Bookings`, `Booking Acceptance`, and `Pasalo` as empty folders.

**Why:** those are exactly the sheet names in
`testing/test-cases/Pickle Rick Test Cases.xlsx` (verified against the
workbook, not assumed). `docs/claude-instructions.md` requires each automated
test to be traceable to a `Ref No`, and matching the folder structure to the
sheet structure makes that mapping mechanical instead of a judgement call made
fresh on each branch.

Stubbing them now rather than creating them on demand also means the first
request-writing branch has one job — write requests — rather than
simultaneously inventing an organising scheme.

### D8 — Secret handling mirrors the existing `credentials.json` precedent

**Decision:** `environments/local.postman_environment.json` is gitignored;
`environments/local.postman_environment.example.json` is committed with
placeholder values. Runtime values (`runId`, `authToken`, `courtId`,
`bookingId`) are declared as collection variables with empty values and are
only ever populated at runtime.

**Why, stated honestly:** at this scope the environment file contains only
`baseUrl` (`http://localhost:4000`), which is not a secret, so this pattern is
precautionary rather than presently necessary. It is still worth adopting now
for two reasons. It matches what `testing/playwright/config/credentials.ts`
already does, so both suites handle secrets identically and a reader learns
the pattern once. And the moment a sanity folder needs a seeded account's
password, the file holds a real credential — at which point the safe pattern
is already in place rather than being introduced in the same commit that
first adds a password, which is precisely when it gets forgotten.

Declaring `authToken` as an empty collection variable matters for the same
reason: a token captured into an environment file can be written back to disk
by the Postman GUI and committed by accident. Collection variables set at
runtime never persist.

This serves NFR-03 (publishable to GitHub with no security or privacy issues).

---

## 4. File manifest

### New

| Path | Contents |
| --- | --- |
| `testing/postman/package.json` | `private: true`, name `pickle-rick-postman`, newman + htmlextra devDeps, `test` / `teardown` scripts |
| `testing/postman/package-lock.json` | Committed, not hand-edited |
| `testing/postman/PickleRick.postman_collection.json` | Collection v2.1: info block, six empty folders, collection-level pre-request script minting `runId`, four empty collection variables |
| `testing/postman/environments/local.postman_environment.example.json` | `baseUrl` placeholder; committed |
| `testing/postman/environments/local.postman_environment.json` | Real values; gitignored |
| `testing/postman/scripts/run.js` | newman Node API; teardown in `finally`; exits non-zero on failure |
| `testing/postman/scripts/teardown.js` | Spawns `docker compose exec -T postgres psql -v ON_ERROR_STOP=1`, pipes D5's SQL via stdin, reports rows deleted |
| `testing/postman/README.md` | Setup, run commands, the `runId` convention, how to add a request, teardown behaviour and its SIGINT limitation |

### Modified

| Path | Change |
| --- | --- |
| `.gitignore` | Add `testing/postman/environments/local.postman_environment.json` and `testing/postman/newman/` |
| `CLAUDE.md` | § Testing — replace the bare `newman run …` line with `cd testing/postman && npm test`, per D6 |
| `docs/roadmap.md` | Tick the Postman line item in §2; note it is scaffolding-only with content pending |

---

## 5. Acceptance criteria

Scaffolding with no requests cannot be verified by "the suite went green" —
there is nothing to be green. It is verified instead by these checks, which
between them exercise every risky path:

1. `cd testing/postman && npm ci` completes on a clean clone.
2. `npm test` runs newman against the collection, reports 0 requests
   executed, and exits 0.
3. **`npm run teardown` against the running stack prints `DELETE 0` for each
   statement and exits 0.** This is the load-bearing check: it proves
   `docker compose exec` reaches the container, the psql credentials are
   right, all seven statements parse against the real schema, and the
   dependency order is valid — none of which requires a single test row to
   exist.
4. Teardown against a *stopped* stack fails with a readable message naming
   the likely cause, not a raw Docker stack trace.
5. `git status` is clean after a full run — no report output, no environment
   file, nothing untracked.
6. The collection opens in the Postman GUI with all six folders present.

Check 3 is the reason this branch is verifiable at all, and the reason
teardown is built first rather than alongside the first requests.

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| Teardown couples to the schema (D4 trade-off) | `ON_ERROR_STOP=1` — a schema change breaks it loudly, never silently |
| Ctrl+C skips teardown (D6 limitation) | Prefix-scoped cleanup is retroactive; next run sweeps orphans |
| `docker compose exec` requires the stack up | Documented; acceptance criterion 4 requires a readable failure |
| Hard-coded DB credentials in teardown | They match `docker-compose.yml`'s local-only values; no secret is introduced |
| **Unverified:** newman's exit behaviour on a collection with zero requests | Acceptance criterion 2 assumes it runs and exits 0. Not yet confirmed. Implementation step 1 tests this against a throwaway collection *before* any file is written — if newman errors instead, D7 needs revisiting (most likely by giving the `Smoke` folder its `GET /health` request after all, since a collection would then need at least one item to be runnable) |

## 7. Out-of-scope observation

`docs/roadmap.md` §2 still reads "Testing — nothing exists yet /
`testing/` isn't in the repo at all". That is stale — `testing/playwright/`
has since been built and merged. This branch corrects only the Postman line
it touches; bringing the Playwright entries up to date is a separate
`docs/` change and is deliberately not bundled here.

---

## 8. Traceability

| Requirement | How this branch relates |
| --- | --- |
| NFR-03 (publishable, no security issues) | D8 — secrets and tokens never reach git |
| `CLAUDE.md` § Testing (cleanup rule) | D3, D4, D5, D6 — teardown built in, not bolted on |
| `docs/claude-instructions.md` § Testing (`Ref No` traceability) | D7 — folders mirror workbook sheets |
| `docs/claude-instructions.md` § Lockfile discipline | D1 — committed lockfile |
| `docs/roadmap.md` §2, §3.5 (Postman first) | This branch is the first step of that phase |

---

*Cross-reference: [claude-instructions.md](../claude-instructions.md),
[roadmap.md](../roadmap.md),
[software-requirements-specification.md](../software-requirements-specification.md).*
