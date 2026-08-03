# Pickle Rick — Instructions for Claude Code

Pickle Rick is a Pickleball Court Management System (Admins) and
Reservation System (Players) in one app. It's a learning project and
GitHub portfolio piece — prioritize clear, well-commented code over
clever shortcuts, and cite requirement IDs (BR-XX, FR-XX, NFR-XX, UC-XX)
in comments when you implement something they describe.

See `README.md` for the full architecture writeup and setup instructions.

## The bible — read these before implementing a new feature

@docs/business-requirements.md
@docs/business-rules.md
@docs/software-requirements-specification.md
@docs/use-case-specification.md
@docs/claude-instructions.md

If a requirement is ambiguous, check whether the Business Rules doc
resolves it before guessing — it's the most detailed of the five.

## Architecture (see README.md § 2 for the full rationale)

- `backend-node/` — Express REST API, source of truth (writes). Auth,
  courts, bookings, inventory.
- `analytics-service-python/` — FastAPI, read-only. Revenue/profit
  reporting only. Never add write endpoints here.
- `frontend/` — React + Vite.
- `db/schema.sql` — the one source of truth for the schema. Edit this,
  not the running database directly.

## Conventions

- **No ORM.** Raw SQL via `pg` (Node) and `psycopg2` (Python), on purpose
  — the goal is to learn SQL, not hide it. Keep new queries in the same
  style as `backend-node/src/models/*.js`.
- Controllers validate input and enforce business rules; models are just
  SQL. Keep that split when adding features.
- `req.user.id` / `req.user.role` (Node) come only from the verified JWT —
  never trust a client-supplied admin/user ID in a request body.
- Comment code thoroughly. This project is explicitly for learning full-stack
  development — comments should explain *why*, not just *what*.

## Build & run

- Full stack: `docker compose up --build` from the repo root (not
  detached — see `docs/claude-instructions.md`).
- Backend only: `cd backend-node && npm run dev`
- Analytics only: `cd analytics-service-python && uvicorn app.main:app --reload --port 5000`
- Frontend only: `cd frontend && npm run dev`
- Schema changes require `docker compose down -v` then `up --build` to
  re-run `db/schema.sql` against a fresh database.

## Testing

- Postman: `newman run testing/postman/PickleRick.postman_collection.json`
  (stack must be running)
- k6: `k6 run testing/k6/load-test.js`
- Playwright: `cd testing/playwright && npx playwright test` (stack must
  be running). Run headful, not headless — this project is also for
  practicing automation testing, so tests should be observable, same as
  Docker (see `docs/claude-instructions.md`).

## Git

- `main` (production/demo) / `qa` (testing) / `feature/<purpose>` (all
  local dev).
- Flow: branch `feature/<purpose>` off `qa` → merge into `qa` to shake out
  bugs → merge `qa` into `main` once stable. Never develop directly on
  `qa` or `main`.
- No CI/CD pipeline yet, so these merges are manual for now and PRs are
  being skipped to stay focused on building features first. Once the
  GitHub Actions pipelines (Development/QA/Main, see
  `docs/claude-instructions.md`) exist, merging and automated testing
  between branches should go through them instead.
