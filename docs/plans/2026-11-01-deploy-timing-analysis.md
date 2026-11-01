# Deploy Timing Analysis — Deploy As-Is, or Wait for an MVP?

*Pickle Rick · 2026-11-01 · status: PROPOSED · answers decision D1 in the
[migration plan](2026-11-01-supabase-vercel-migration-plan.md)*

## The question

You have not used Pickle Rick much yet, there is a lot left to test and
improve, and a 2.0 redesign is coming. Do we put it on Supabase/Vercel now,
or wait?

The question hides three different things that should not be decided together:

1. **Building the deployment platform** (database, hosting, pipelines, backups).
2. **Exposing a running copy to anyone but you.**
3. **Calling it a public release** that people may judge.

They have different risks, so they can happen at different times.

## What "as is" actually means today

| Area | State | Source |
| --- | --- | --- |
| Booking, courts, Pasalo, inventory, profile, account deletion | Built, API-tested (147 Postman requests) | roadmap §1 |
| Shop / checkout / order history | **Not built** (BR-07 second half, Epic PR-3) | roadmap §2 |
| Revenue / profit / analytics | **Not built**, profit model undecided (Epic PR-4, FR-09) | roadmap §2 |
| Notifications | Not built (PR-5) | Jira |
| Hardening: fail-fast config, helmet, rate limit, secrets audit | **Not done** (PR-52/53/55) | Jira |
| README, seed data | **Missing** (PR-58, PR-57) | Jira |
| Playwright coverage | Auth + Court Management only; Bookings/Acceptance/Pasalo specs open (PR-38–41) | Jira |
| Your own hands-on usage | Little | you |
| Possible defect | Deleted-account tokens may still be accepted | migration plan finding 12 |

Two of the Business Requirements' headline outcomes (BRD "Revenue Dashboards",
BR-07 shop) do not exist yet. Publicly, that is a half-finished product.

## Options

### A. Deploy to a public production URL now

**For:** earliest learning about the platform; a live link sooner.
**Against:**
- Public `main` on a login-protected app with **no rate limiting, no secrets audit, no README** is a poor first impression and a real exposure of a login endpoint.
- Free-tier realities (Supabase pause, 1-hour Vercel logs, no backups) become *your* uptime problem before you have anything worth keeping up.
- Real defects you have not found yet would be found by visitors.
- It couples platform risk to product churn: every redesign decision lands on a live system.
- A portfolio reviewer sees the first impression once.

### B. Build everything, deploy once at the end

**For:** a polished first public impression.
**Against:**
- The riskiest unknowns are *platform* unknowns (uploads on a read-only filesystem, pooler behaviour, cold starts, CORS, RLS). Discovering them after the Shop and Analytics are built means reworking finished code.
- Big-bang integration is the classic way to turn a 1-day problem into a 2-week one.
- You would still have not used the app, because nothing forces you to.
- You are learning systems thinking; operating a real deployment is the teacher.

### C. Staged — build the platform now, keep it private, go public at an MVP gate (recommended)

1. **Now:** build the deployment platform and deploy the *current* app to a **protected QA environment** (Vercel Authentication on, so only you can open it; Supabase `qa` project). Nothing public, nothing to apologise for.
2. **Use it.** Run a dogfooding period on QA (below). This is the missing user research.
3. **MVP gate:** when the exit criteria below are met, create the `prod` environment and release publicly as the MVP.
4. **2.0** ships later to prod as the first visibly redesigned release, with the "What's new" page.

**Why this wins:** it removes the platform risk early, costs almost nothing
(QA is free and private), forces you to finally use the product, and keeps
the public moment for when it is defensible. It also keeps infrastructure
work out of the redesign's blast radius.

| | A. Public now | B. Big bang | **C. Staged** |
| --- | --- | --- | --- |
| Platform risk found early | ✅ | ❌ | ✅ |
| Public exposure while unfinished | ❌ high | ✅ none | ✅ none |
| Forces real usage | partly | ❌ | ✅ |
| Free-tier ops burden before value | ❌ | ✅ | ✅ low (QA only) |
| Fits agile (small, early, reversible) | partly | ❌ | ✅ |
| Learning value | high | low-medium | **highest** |

## Dogfooding period (starts when QA is up)

Not abstract "testing" — you, using it as both roles for a defined time.

- **Duration:** 2 weeks or 3 sprints-worth of real use, whichever first
- **Scenarios** (written once, repeated): register as a player in Davao; browse only Davao courts; book consecutive slots and see them merge; contested slot on a manual court; auto-approval court; two players on one booking (Pasalo, up to 8); admin approves and the others cancel; edit inventory; delete account as player and as admin and check the cascade
- **Logging rule:** anything surprising, confusing or annoying goes to Jira within the day, labelled `dogfood`. "Annoying" is a valid defect — that feeds the 2.0 redesign
- **Observe the system, not just the UI:** what does the cold start feel like? what happens after a Supabase pause? what do the logs show for a failed booking?

## MVP gate — proposed Definition of MVP (v1.2.0 public release)

All of these, nothing else:

**Product**
- [ ] BR-01 … BR-08 functionally complete — i.e. **Shop and Orders** (PR-3) done
- [ ] FR-09 **revenue per court per month** available (PR-27, PR-31). *Profit and potential revenue (PR-28/29) can wait for 1.3* — the cost model is undecided and shouldn't block launch
- [ ] No open defect of Highest/High priority

**Quality**
- [ ] Postman suite green on QA; Playwright covers booking and acceptance flows (PR-38–41 at least the happy paths)
- [ ] Negative authorization tests (PR-43), including the deleted-account token defect

**Security & operations**
- [ ] PR-52, PR-53, PR-55, PR-56, PR-60 done
- [ ] Production-grade controls in the [migration plan §8](2026-11-01-supabase-vercel-migration-plan.md) ticked, except items explicitly listed as deferred
- [ ] Backup taken **and restored** at least once
- [ ] Rollback performed once on QA

**Presentation**
- [ ] README with architecture, screenshots, live link (PR-58); seed data (PR-57)
- [ ] CHANGELOG entry and "What's new" content for the release

If the gate drags, cut scope from the product list (e.g. ship Shop without
order history first), **not** from security or operations.

## Decisions this recommends

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 (revised) | When to deploy | **Staged (C):** QA now, public prod at the MVP gate |
| D5 | Is the redesign (2.0) part of MVP? | **No.** MVP is functional completeness on the current UI; 2.0 is a separate, later release |
| D6 | Version numbers | Existing tags: `v1.0.0` (initial setup), `v1.1.0` (UI revamp). MVP = **`v1.2.0`**, then 1.x minors; redesign = **`v2.0.0`**. Backfill 1.0/1.1 in the changelog from git history |

## Triggers that would change this recommendation

- You want a live link on a CV *this month* → do the public release sooner with a **reduced-scope MVP** (no Shop/Analytics, clearly labelled "Preview"), but only after the security gates
- QA reveals the platform can't carry the workload (cold starts, limits) → revisit D2 (container host for the API) *before* building more
- Real users (not you) want to use it → treat as MVP-now with the security gates, and re-evaluate the Hobby non-commercial terms
