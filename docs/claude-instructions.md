# Claude Instructions

*Pickle Rick*

## Branches

- Branch "main" for Production
- Branch "qa" for QA and Testing
- Local development branches, all cut from `qa`, prefixed by purpose
  (mirrors the commit-type prefixes in "Professional / Production-Grade
  Conventions" below):
  - `feature/<purpose>` — new functionality
  - `fix/<purpose>` — bug fixes
  - `test/<purpose>` — test infrastructure/tooling (Postman, k6,
    Playwright) — this is process/tooling work, not a shipped product
    feature, so it gets its own prefix rather than living under `feature/`
  - `chore/<purpose>` — dependency, config, or tooling work with no
    behavior change
  - `docs/<purpose>` — documentation-only changes
  - `refactor/<purpose>` — internal restructuring, no behavior change
  - `ci/<purpose>` — GitHub Actions / pipeline changes

### Flow

Development always happens on one of the prefixed branches above, never
directly on `qa` or `main`.

1. Branch `<prefix>/<purpose>` off `qa`.
2. Merge `<prefix>/<purpose>` into `qa` to check for bugs/issues.
3. Once `qa` is verified stable, merge `qa` into `main` for production.

For now (no CI/CD pipeline yet), merges in this flow are done manually and
PRs/pull requests are being skipped so development can stay focused on
building out Pickle Rick's features first. Once the GitHub Actions
pipelines below exist, merging and automated testing between these
branches should be executed through them instead of manually.

## GitHub

### Repo

- Repo "Pickle Rick"

### Actions

Three pipelines: GitHub Actions should have a check and testing for every
code merge.

- Development
- QA
- Main

## Environment

- The application should be in Docker.
- During local development, actual development should be visible, so
  Docker must not be headless.
- Playwright tests should also run headful (not headless) during local
  development, in the same spirit — the point is to practice and observe
  automation testing, not just get a pass/fail result.

## Testing

- All test types — Smoke/Sanity (Postman), Load (k6), and E2E
  (Playwright) — must clean up any data they create (test users,
  bookings, orders, etc.) once the run finishes. The dev database should
  only ever contain data someone put there on purpose.

## Tech Stack

- Node.JS
- Python
- RestAPI
- Docker
- Git and GitHub
- Postman (Manual and Automation)
- Performance Testing (k6)
- Automation Testing (Playwright + TypeScript)

## Professional / Production-Grade Conventions

Even though Pickle Rick is a learning project and portfolio piece,
default to the same conventions a real production codebase would use in
every aspect — code, git, tooling, process — unless a specific doc says
otherwise. This section is the running list of what that means concretely
here.

### Commit messages

Already in use (see `git log`): `[Type]: description`. Keep using it,
with the full type list, matching the branch prefixes above: `feature`,
`fix`, `docs`, `chore`, `test`, `refactor`, `perf`, `ci`. This is this
repo's own bracketed variant of
[Conventional Commits](https://www.conventionalcommits.org/).

### Suggested standards not yet adopted

Backlog, not a mandate to implement all at once — pick one up when it's
relevant to the work already in progress, or when asked:

- **Linting/formatting**: ESLint + Prettier for `backend-node` and
  `frontend`; Ruff (or Black + Flake8) once `analytics-service-python`
  exists. Keeps style out of code review.
- **Pre-commit hooks**: Husky + lint-staged (Node side) once linting
  exists, so issues are caught before a commit, not in CI.
- **Structured logging**: replace ad hoc `console.log`/`print` with a
  real logger (e.g. `pino` in `backend-node`, `structlog` or standard
  `logging` in Python) — needed once this runs anywhere but a dev
  terminal.
- **Security hardening** (NFR-03): `helmet` for secure HTTP headers,
  `express-rate-limit` on `/api/auth/*` at minimum.
- **Config validation on boot**: fail fast if a required env var
  (`DATABASE_URL`, `JWT_SECRET`, etc.) is missing, instead of surfacing a
  confusing failure later.
- **API versioning**: consider an `/api/v1` prefix before the route
  surface grows much further — cheap now, expensive to retrofit later.
- **Lockfile discipline**: commit `package-lock.json` / a pinned
  `requirements.txt`; don't hand-edit them.
- **Changelog**: `CHANGELOG.md` once `main` starts getting tagged
  releases.
