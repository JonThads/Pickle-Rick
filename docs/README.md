# Pickle Rick documentation

Documents are grouped by purpose, regardless of which tool wrote them.

## Reading order

1. Read the root [README](../README.md) for the project and setup.
2. For product behavior, read the [business requirements](requirements/business-requirements.md), [business rules](requirements/business-rules.md), [SRS](requirements/software-requirements-specification.md), and [use cases](requirements/use-case-specification.md). Consult business rules first when a requirement is ambiguous; preserve unresolved conflicts.
3. For development, start with [AGENTS.md](../AGENTS.md) or [CLAUDE.md](../CLAUDE.md), then the appropriate workflow guide.
4. For direction, consult planning documents, checking their dates and proposal status before treating them as decisions.
5. For prior results, read dated verification reports. They describe the recorded run, not a guarantee about today's application.

## Document map

| Location | Purpose |
| --- | --- |
| [requirements/](requirements/) | Product requirements and rules, with stable BR/FR/NFR/UC IDs |
| [workflow/](workflow/) | [Codex workflow](workflow/CODEX-INSTRUCTIONS.md) and [shared conventions / Claude workflow](workflow/claude-instructions.md) |
| [planning/](planning/) | Direction, delivery rationale, active plans, and proposals |
| [verification/](verification/) | Dated checks, results, failures, cleanup, and limitations |
| [archive/](archive/) | Historical plans and designs retained for their decisions and execution history |
| [CHANGELOG.md](../CHANGELOG.md) | Completed changes and tagged release history |

## Planning

- [PR-17 booking comment audit plan](planning/2026-11-04-PR-17-booking-comments-plan.md): scope and verification steps for the comment-only audit.
- [Roadmap](planning/roadmap.md): implementation direction and dated progress notes.
- [Project plan overview](planning/project-plan-overview.md): delivery rationale, traceability, and historical backlog snapshot; live Jira owns ticket status.
- [Pickle Rick 2.0 initiative](planning/2026-11-01-pickle-rick-2-0-initiative.md): proposed working agreement, versions, redesign, and learning track.
- [Supabase / Vercel migration](planning/2026-11-01-supabase-vercel-migration-plan.md): proposed deployment architecture and sequence.
- [Deploy timing analysis](planning/2026-11-01-deploy-timing-analysis.md): proposed deployment timing and MVP gate.

## Verification and history

- [Implementation workflow](workflow/implementation-workflow.md): required
  eight-stage development and promotion sequence.
- [PR-122 validation guide](verification/2026-11-05-PR-122-validation.md): review,
  parallel testing instructions, results, cleanup, and pending gates.

- [PR-135 test case audit](verification/2026-11-09-PR-135-test-case-audit.md)
- [PR-17 booking constraint comment audit](verification/2026-11-04-PR-17-booking-comments.md)
- [PR-123 Pasalo approval verification](verification/2026-11-03-PR-123-pasalo-approval.md)
- [PR-14 court-name verification](verification/2026-10-24-PR-14-court-name-fix.md)
- [PR-35 Postman verification](verification/2026-10-24-PR-35-postman.md)
- [PR-12 / PR-13 / PR-15 / PR-16 verification](verification/2026-10-24-remaining-bugs.md)
- Archived Postman scaffolding: [design](archive/postman-scaffolding/2026-08-08-postman-newman-scaffolding-design.md) and [implementation plan](archive/postman-scaffolding/2026-08-08-postman-newman-scaffolding.md).
- Archived implementation plans: [booking defects](archive/completed-plans/2026-10-24-booking-defects.md) and [PR-35 collection](archive/completed-plans/2026-10-24-PR-35-postman-collection.md).

## Prevent documentation drift

- Update affected documentation and the root [changelog](../CHANGELOG.md) in the same change set as every completed code, configuration, test, or documentation change. Follow the [maintenance rule](workflow/claude-instructions.md#documentation-maintenance).
- Use relative Markdown links. When moving documents, update inbound links, agent imports, and source/workflow comments.
- Put new active plans and designs in `planning/`, using `YYYY-MM-DD-topic.md` or `YYYY-MM-DD-topic-design.md`. This layout overrides tool defaults such as `docs/superpowers/plans`.
- Preserve verification reports as dated evidence. Archive completed or superseded plans that retain useful decisions; delete only confirmed duplicates with no unique content or evidence.
- Archived instructions, unchecked task lists, branch names, and permissions describe past work. They do not authorize new execution or override current workflow. Navigation links may be repaired without changing recorded outcomes.
- Keep proposals, implementation, and executed verification distinct. Moving a file does not validate its contents.
