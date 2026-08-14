# Postman / Newman Suite

Smoke and sanity suite for the Pickle Rick API, run through
[Newman](https://github.com/postmanlabs/newman) (Postman's CLI runner)
against a local `docker compose up --build` stack.

This directory currently ships **scaffolding only** — a runnable, empty
collection, plus a working teardown. No requests exist yet; adding them is
tracked separately (see `docs/roadmap.md` and Jira PR-35). See
[`docs/specs/2026-08-08-postman-newman-scaffolding-design.md`](../../docs/specs/2026-08-08-postman-newman-scaffolding-design.md)
for the full rationale behind every decision below (referenced as D1–D8).

## Setup

```bash
cd testing/postman
npm ci
cp environments/local.postman_environment.example.json environments/local.postman_environment.json
```

The stack must be running first: `docker compose up --build` from the repo
root.

## Running

```bash
npm test        # runs the collection via scripts/run.js, then always tears down
npm run teardown # runs cleanup on its own, without running the collection
```

`npm test` drives Newman through its Node API rather than the bare CLI, so
teardown runs in a `finally` block — on a passing run, a failing assertion,
or a thrown exception alike (D6).

## The `runId` convention

A collection-level pre-request script mints one `runId` per run and stores
it as a collection variable. Every account this suite ever registers must be
addressed as:

```
pm-{{runId}}-<role>@picklerick.test
```

This single convention is what makes teardown safe and idempotent (D3):

- Cleanup matches rows by the literal `pm-` email prefix, so it cannot touch
  a row a human created by hand.
- Two runs (or a Postman run overlapping a Playwright run) get different
  `runId`s and never collide on the `users.email` unique constraint.
- A crashed or Ctrl+C'd run still leaves its rows carrying the `pm-` prefix,
  so the *next* `npm run teardown` sweeps them up. Cleanup is retroactive,
  not dependent on any one run exiting cleanly.

## Adding a request

When it's time to add real requests (out of scope for this scaffold — see
D7), add them into the matching empty folder (`Auth`, `Court Management`,
`Player Bookings`, `Booking Acceptance`, `Pasalo`, or `Smoke`), following the
`Ref No` naming from `testing/test-cases/Pickle Rick Test Cases.xlsx` per
`docs/claude-instructions.md`. Capture tokens/IDs into the existing
collection variables (`authToken`, `courtId`, `bookingId`) rather than
hardcoding them, and register any new test accounts under the `runId`
convention above.

## Teardown limitations

Teardown goes through `docker compose exec ... psql` rather than an API
endpoint (D4), because no `DELETE` route exists that could remove only test
rows. It deletes children before parents (D5) rather than relying on the
`users` row's `ON DELETE CASCADE`, because `order_items.item_id` is
`ON DELETE RESTRICT` in `db/schema.sql` — a bare cascade delete would abort
with a foreign-key violation the moment any order references one of those
items.

**Known gap:** `finally` does not run on `SIGINT`, so Ctrl+C during `npm
test` skips teardown for that run. This is why `npm run teardown` stays
independently callable, and why the `runId`/`pm-` prefix scheme makes
cleanup retroactive rather than one-shot.
