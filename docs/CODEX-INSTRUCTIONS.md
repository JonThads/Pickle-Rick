# Pickle Rick — Codex Instructions

Use this guide to carry out focused, verifiable work in this repository.
Project purpose, architecture, and core conventions live in [AGENTS.md](../AGENTS.md).
This guide adds a task workflow; it does not redefine product requirements.

## 1. Start with the requested outcome

1. Read `AGENTS.md`, then inspect `git status --short --branch` and the relevant
   diff. Preserve existing work and identify which changes belong to this task.
2. For a product feature or behavioral fix, read the BRD, Business Rules, SRS,
   and use cases linked from `AGENTS.md`. Trace the affected requirement IDs.
   For documentation or tooling work, load the relevant sections instead of
   repeatedly reading the entire repository.
3. Follow the request through the affected route, controller, model, schema,
   API client, UI, and tests. Use `rg` and targeted reads to find that path.
4. State the intended result and any material assumption. Proceed with routine
   implementation choices; ask a focused question when conflicting requirements
   would change the product behavior.

Completion: the affected behavior, files, requirements, and existing work are
understood well enough to make a scoped change.

## 2. Use the appropriate source

| Question | Source |
| --- | --- |
| What should the product do? | [Business Requirements](business-requirements.md), [Business Rules](business-rules.md), [SRS](software-requirements-specification.md), [Use Cases](use-case-specification.md), and explicit user decisions |
| What exists now? | Current source, schema, configuration, and tests; executed checks establish runtime behavior |
| What work is planned, and why? | [Roadmap](roadmap.md) and [Project Plan Overview](project-plan-overview.md); inspect snapshot dates before relying on status |
| What is the current ticket or PR status? | The connected Jira/GitHub record when available; local documents and remote-tracking refs can be stale |
| What setup or commands are available? | [README](../README.md), package scripts, Docker Compose, and test configuration |

Consult the Business Rules first when a requirement is ambiguous. If the rules,
use cases, or user clarification still conflict, describe the specific conflict
before implementing that behavior. Code shows implementation, not necessarily
correctness. Preserve dated historical findings as history when refreshing docs.

Shared project conventions are also documented in
[claude-instructions.md](claude-instructions.md). Apply them to Codex work too;
do not copy their entire backlog into this guide or treat backlog items as
authorization to implement unrelated changes.

## 3. Keep changes easy to learn and review

- Keep writes in Express and raw SQL in models. Controllers validate inputs,
  authorize the actor, and coordinate business rules. Keep multi-query database
  transactions on one checked-out connection in the model layer.
- Derive identity from the verified token. Check resource ownership in addition
  to role, and enforce business restrictions server-side even when the UI hides
  the action. See `itemController.js` for the existing court-ownership pattern.
- Maintain `db/schema.sql` as the schema source. Use constraints for invariants
  and transactions/locking where concurrent actions could break a rule.
- Explain why non-obvious code exists and cite applicable BR/FR/NFR/UC IDs.
  Reuse the project's patterns and avoid unrelated abstractions or dependencies.
- Keep the future Python analytics service read-only. Its scaffold and profit
  cost model are pending; agree the reporting inputs before building it.
- Keep local secrets, credentials, uploads, and generated test artifacts out
  of Git. Read credential structure from example files when possible.

## 4. Distinguish the two booking request flows

- **Court booking:** a player requests a court/date/hour. Auto approval confirms
  it immediately; manual approval requires the court admin's decision.
- **Pasalo:** a player asks to join an already approved booking. The original
  booker decides, and the eight-player limit includes that booker.

Open clarification as of 2026-10-24: Business Rules forbid multiple pending
manual booking requests for one slot; UC-05-02 (Admin) and the implementation
allow them. The user associated competing requests with Pasalo, which is a
separate flow. Confirm whether multiple initial court-booking requests should
coexist before changing this rule. Multiple Pasalo join requests do not resolve
the initial-booking ambiguity. Until clarified, preserve current behavior and
do not present the disputed rule as settled.

## 5. Verify the changed behavior

- Run the smallest meaningful checks for the affected path. For behavioral fixes,
  cover the failed rule, authorization boundaries, and relevant concurrency cases.
  Documentation-only work needs link/path and diff checks, not a full stack run.
- Use the existing Postman, k6, and Playwright suites instead of rebuilding their
  scaffolding. Check actual files and scripts before choosing commands; the k6
  script currently present is `testing/k6/smoke-test.js`.
- Start Docker attached locally so logs remain visible. Run Playwright headed
  locally; its existing config handles headless execution in CI.
- Keep E2E tests mapped to `Ref No` in
  `testing/test-cases/Pickle Rick Test Cases.xlsx`, including the workbook's
  `Automation Script` column when adding coverage. Read the spreadsheet skill
  before editing that workbook. Assert the expected behavior itself.
- Use disposable test data and reliable teardown. Confirm cleanup after a run;
  skipped or failed cleanup must be reported and addressed without deleting
  unrelated data.
- A database reset using `docker compose down -v` destroys local volumes.
  Inspect the situation and obtain explicit authorization before using a reset
  that would erase existing user data. Prefer targeted test teardown.
- Record what was run and its result. Separate source inspection, executed
  verification, skipped checks, and unresolved failures. Never label unrun
  behavior as passing or infer GitHub branch protection from workflow YAML.

## 6. Keep Git changes attributable

- Follow the repository's `<prefix>/<purpose>` branches from `qa`; use the
  applicable Jira key when known. Keep development off `qa` and `main`.
- Reuse a suitable current branch for its existing task. Keep unrelated work
  separate with explicit file staging and separate commits/PRs. A branch name
  does not checkpoint uncommitted files, including untracked files.
- Inspect branch divergence and the working tree before switching, rebasing,
  merging, or creating a worktree. Preserve user edits; avoid automatic stashing,
  hard resets, or blanket staging that mixes unrelated changes.
- Use Conventional Commits and real ticket keys when available; do not invent
  a ticket or change its status without verifying it. Existing commit style in
  history is not a reason to restore the retired `[Type]:` convention.
- Integrate through PRs into `qa`, then `qa` into `main`, using the required
  checks. Report known failing regression tests explicitly; resolve their product
  defect or agree an explicit tracking strategy before seeking a green merge.

## 7. Finish with evidence

Inspect the final diff and working-tree status. Update implementation-status
docs when behavior or tooling changes, keeping planned, implemented, and tested
states distinct. Report the outcome, changed files, verification, remaining
limitations, and any next decision in concise language.
