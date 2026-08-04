# Claude Instructions

*Pickle Rick*

## Branches

- Branch "main" for Production
- Branch "qa" for QA and Testing
- Branch "feature/[purpose]" is for local development

### Flow

Development always happens on a `feature/<purpose>` branch, never directly
on `qa` or `main`.

1. Branch `feature/<purpose>` off `qa`.
2. Merge `feature/<purpose>` into `qa` to check for bugs/issues.
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
