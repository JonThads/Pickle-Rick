# PR-17 Booking Comment Audit Implementation Plan

**Goal:** Complete [PR-17](https://pickle-rick.atlassian.net/browse/PR-17) by auditing booking comments against the schema while preserving the unresolved pending-request policy.

**Scope:** Comments and documentation only. No API behavior, SQL statements, requirements, or test assertions change. Work on `docs/PR-17-booking-constraint-comments` from `origin/qa`; do not merge into `qa` or `main`.

## Execution

- Inspect the live ticket, current workflow, controller/model guards, schema constraints, FR-06/NFR-02, Business Rules, and UC-05-02 (Admin). Record the checked base commit.
- Correct misleading comments in [bookingController.js](../../backend-node/src/controllers/bookingController.js), [Booking.js](../../backend-node/src/models/Booking.js), and [schema.sql](../../db/schema.sql). Explain approved-only uniqueness, application guards, and the unresolved policy. Keep FR-08 Pasalo distinct.
- Record findings and verification in the [audit report](../verification/2026-11-04-PR-17-booking-comments.md). Update the [documentation index](../README.md) and [changelog](../../CHANGELOG.md).
- Compare JavaScript and SQL with full-line comments removed against the base. Run JavaScript syntax, local Markdown path, and whitespace checks. Review the complete diff for scope and policy claims.
- Leave the local branch ready for review, without pushing, opening a PR, or merging. Move Jira to For Testing for the review/verification handoff; do not mark Done before integration under the repository workflow.

**Verification boundary:** This is a source audit. It does not establish live API/database behavior. No new tests, dependency installation, Docker startup, or database reset are needed for comment-only edits.

**Execution record:** See the dated audit report for completed steps and results.
