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
2. Open a pull request into `qa` — the QA pipeline (see "Actions" below)
   runs the full Postman + Playwright suite against it before it can
   merge.
3. Once `qa` is verified stable, open a pull request from `qa` into
   `main` for production — the Main pipeline additionally runs k6, a
   Docker image build check, and a secrets scan.

The GitHub Actions pipelines below are implemented and gate every merge
into `qa` and `main` via required status checks — merges are no longer
manual and PRs are no longer skipped.

## GitHub

### Repo

- Repo "Pickle Rick"

### Actions

Three pipelines: GitHub Actions should have a check and testing for every
code merge. All three are implemented (`.github/workflows/`).

- Development — lint/build/boot-check, fires on pushes to the prefixed
  branches above (not `qa`/`main`)
- QA — full Postman + Playwright suite, gates PRs/pushes into `qa`
- Main — QA's suite plus k6, a Docker image build check, and a secrets
  scan, gates PRs/pushes into `main`; optional manual
  `workflow_dispatch` tags a release

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
- `testing/test-cases/Pickle Rick Test Cases.xlsx` is the source of truth
  for manual/E2E test case coverage — one sheet per module (Auth, Court
  Management, Player Bookings, Booking Acceptance, Pasalo), each row
  identified by a `Ref No` (e.g. `AUTH-01-001`). When writing a Playwright
  spec for a case, name the `test()` after its `Ref No` and fill in that
  row's `Automation Script` column with the spec file/test name, so the
  mapping between test cases and automation stays traceable in both
  directions.

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

### Conventional Branch

Use the standards established in [conventionalbranch.org](https://conventionalbranch.org/)

Note:

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

### Conventional Commits

Disregard already used previous Commit Messaging Standard primarily,

"Already in use (see `git log`): `[Type]: description`. Keep using it,
with the full type list, matching the branch prefixes above: `feature`,
`fix`, `docs`, `chore`, `test`, `refactor`, `perf`, `ci`."

Instead, use the standards established in [Conventional Commits](https://www.conventionalcommits.org/).

Also use the Jira Work Item keys for the git commit messages (For example, git commit -m "JRA-123) to reference work items in development spaces. When you create a pull request, use the key in the pull request title.

Jira Reference: [support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work](https://support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work/)

For Pull Requests:

Check out a new branch in your repo, using the work item key in the branch name. For example, git checkout -b JRA-123-<branch-name></branch>.When you create a pull request, use the work item key in the pull request title.

### Conventional Comments

Use the standards established in [conventionalcomments.org](https://conventionalcomments.org/)

Plus a Reference Work Item or Ticket Number.

For example, "[Comment] as per Jira Work Item RAG-14"

### Common Changelog

Use the standards established in [common-changelog.org](https://common-changelog.org/)

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
