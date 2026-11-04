# PR-17 Booking Constraint Comment Audit

Date: 2026-11-04 (Asia/Singapore). Scope: local source and documentation audit for [PR-17](https://pickle-rick.atlassian.net/browse/PR-17).

Audited base: `50e301be555671134872039e52d2be20bf0f7e0a` (`origin/qa`, fetched before branch creation). Branch: `docs/PR-17-booking-constraint-comments`. Results below describe this base plus this comment-only change set, not later repository states.

## Findings and corrections

| Source | Finding / correction |
| --- | --- |
| [bookingController.js](../../backend-node/src/controllers/bookingController.js) | The original blanket-UNIQUE claim was already corrected. Clarified the separate approved-slot and same-player pending-request guards, model recheck, and unresolved policy. Approval documentation now describes current behavior rather than endorsing competing requests. |
| [Booking.js](../../backend-node/src/models/Booking.js) | The approved-only index and court-lock comments already matched the SQL. Added the unresolved-policy qualification to creation and competing-request cleanup comments. The locked insert rejects an existing approved booking or this player's pending request. |
| [schema.sql](../../db/schema.sql) | Replaced the statement that pending requests "must coexist" with the actual index boundary: only approved rows participate. Pending/cancelled rows are excluded; the index alone cannot reject a pending insert into an approved slot. |

The model's creation and approval paths lock the same parent court row and use one checked-out connection per transaction. The controller's earlier read is not the concurrency boundary. The partial unique index `idx_bookings_slot_approved` provides a final guard against two approved bookings for the same court/date/hour. The `booking_players` uniqueness constraint is separately on `(booking_id, player_id)`; it does not govern initial court requests.

## Policy deliberately left unresolved

[FR-06](../requirements/software-requirements-specification.md) permits booking only a slot not tagged approved. [Business Rules](../requirements/business-rules.md) also forbid a second player's request for the same manual court/date/hour. [UC-05-02 (Admin)](../requirements/use-case-specification.md) instead assumes competing initial bookings and cancellation of the others after approval. The current SQL permits different players' pending requests to coexist. This audit preserves that implementation and does not endorse it as the approved rule.

The project owner must resolve that conflict before a behavioral change. FR-08 Pasalo requests join an existing approved booking and are a separate flow; they do not resolve the initial-booking conflict. See the [current workflow guidance](../workflow/CODEX-INSTRUCTIONS.md#4-distinguish-the-two-booking-request-flows). NFR-02 motivates keeping these comments accurate and explicit.

## Verification

| Check | Result |
| --- | --- |
| Non-comment content against the audited base | PASS for both JavaScript files and the SQL schema. A Node script loaded each base file with `git show`, normalized CRLF, removed full-line comments, and compared it with the working file. Executable statements and SQL remain identical. |
| `node --check backend-node/src/controllers/bookingController.js` | PASS (exit 0). |
| `node --check backend-node/src/models/Booking.js` | PASS (exit 0). |
| Local Markdown path check | PASS: 46 local link targets exist across the index, changelog, plan, and report. The check resolves paths relative to each document; external URLs and fragment destinations were not validated. |
| `git diff --check` | PASS (exit 0). |
| Editor diagnostics | No errors reported for the controller, model, or schema. |
| Final diff review | Comments accurately distinguish approved-only uniqueness, application guards, the unresolved initial-request policy, and Pasalo. Changes are confined to three comment-only source files plus the plan, evidence, index, and changelog. |

No runtime/API verification is claimed. Runtime suites were not run because executable content is unchanged. No test data was created, and no database changes or cleanup were required.

## Delivery boundary

No merge into `qa` or `main`, push, or pull request is part of this local execution. Jira was moved from To Do to In Development, then to For Testing for the verified review handoff, using Atlassian MCP. The issue is not marked Done because the repository workflow reserves that status for integration through `qa` and `main`.
