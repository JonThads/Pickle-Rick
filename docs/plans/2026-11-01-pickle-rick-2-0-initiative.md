# Pickle Rick 2.0 Initiative

*Pickle Rick · 2026-11-01 · status: PROPOSED — a living plan you will edit
as you find features and ideas*

Four things in one document, because they depend on each other:

1. [How we work](#1-how-we-work-agile-working-agreement) — Agile working agreement
2. [Releases and versions](#2-releases-and-versions) — path from today to 2.0
3. [Pickle Rick 2.0](#3-pickle-rick-20-redesign-and-whats-new) — redesign and the "What's new" section
4. [Systems-thinking track](#4-systems-thinking-track) — the real purpose

---

## 0. Purpose and how it changes the way we build

Your stated goal: learn **systems thinking and architecture**, not code,
because code is now cheap and most of Pickle Rick is AI-written. That inverts
the usual risk. When code is cheap, the scarce skills are:

- deciding **what** to build and **why** (requirements, trade-offs)
- understanding **how parts interact** (data flow, failure modes, feedback loops)
- **verifying** that what was built is what was meant (tests, observability)

The danger of vibe-coding is not bad code; it is a system whose behaviour
*you* cannot predict or explain. So the working agreement below is built
around **decision rights** and **explain-back**:

| You own (decide) | Claude proposes and implements | Both verify |
| --- | --- | --- |
| What problem, which priority, accept/reject trade-offs | Options with trade-offs, code, tests, docs | Tests, health checks, demos |
| Architecture decisions (written as ADRs) | Diagrams, drafts of ADRs | Review of ADRs in plain language |
| "Done" (Definition of Done) | Evidence it is done | Sprint review |

If a decision is yours and Claude made it silently, that is a process bug.

---

## 1. How we work: Agile working agreement

Solo project, so this is **Scrum-lite plus Kanban limits**. The ceremonies exist
to produce decisions and learning, not paperwork. All state lives in Jira
(`PR` project) and git.

### 1.1 Cadence

| Element | Rule |
| --- | --- |
| Sprint length | **1 week** (small enough to course-correct; you are new to the product) |
| Sprint goal | One sentence, outcome-based ("QA environment is live and I can log in") |
| WIP limit | **2 items in progress**; finish before starting |
| Planning | ~30 min: pick a goal, pull ready items; commit to *less* than you think |
| Daily | None. Async: a short status note in the Jira ticket when it changes |
| Review (end of sprint) | **Use the thing.** Demo to yourself on QA, accept or reject each item against its acceptance criteria |
| Retro | 15 min, three prompts: what surprised me, what did I not understand, what do I change. Written in `docs/retros/YYYY-MM-DD.md` |
| Release | At sprint end *if* releasable; otherwise at the next one. Each release gets a version and a changelog entry |

### 1.2 Backlog and the "ideas" funnel

You said you are still looking for features. Give ideas a place that is not the
sprint:

`Idea` → `Refined` (problem statement + acceptance criteria) → `Ready` → `In Progress` → `Review` → `Done`

- **Idea:** one line, no commitment. Jira label `idea`, no epic needed
- **Refinement:** answer *Who is this for? What changes for them? How do we know it worked? What does it touch (data, API, UI)?* This is where the systems thinking happens, before code
- **Spike** (time-boxed, e.g. 2 hours) for anything with unknowns; output is a decision, not code
- Keep the **epics** already in Jira (PR-2 … PR-11); add `Pickle Rick 2.0` as a new epic (§3) and `Platform: Supabase + Vercel` under PR-10

### 1.3 Definition of Ready / Done

**Ready:** problem stated · acceptance criteria testable · requirement IDs
cited (BR/FR/NFR/UC) · dependencies known · fits in ~1 day of work.

**Done** (applies to every ticket, in addition to its criteria):
- [ ] Tests added/updated and green in CI (Postman/Playwright where it touches behaviour); test data cleaned up
- [ ] Deployed to QA and **checked there by you**
- [ ] Docs updated (roadmap, business rules/SRS if rules changed, runbook if ops changed)
- [ ] CHANGELOG entry added if user- or operator-visible
- [ ] If it involved a design choice: an ADR (below)
- [ ] You can **explain it back** (§4.3)

### 1.4 Branching and commits (unchanged, restated)

`<prefix>/PR-<n>-<purpose>` off `qa` → PR to `qa` (QA pipeline) → PR `qa`→`main`
(Main pipeline). Conventional Commits with the Jira key. This already matches
`docs/claude-instructions.md`; nothing new to learn here.

### 1.5 Metrics (lightweight, for learning, not for reporting)

Lead time (idea → QA), deploy frequency, change-failure rate (deploys that
needed a rollback/hotfix), time to restore. Four numbers per month in the
retro; they show whether the system you built is getting healthier.

---

## 2. Releases and versions

Existing tags: `v1.0.0` (Initial Release, 2026-08-03) and `v1.1.0` (UI Revamp,
2026-08-04). Pickle Rick has far outgrown them, so we treat 1.x as the
**pre-launch line** and give the story a clear spine:

| Version | Meaning | Gate |
| --- | --- | --- |
| 1.0.0 / 1.1.0 | Already tagged (backfilled in the changelog from git history) | done |
| **1.2.0** | **MVP, first public release** (platform live, Shop, revenue view, hardened) | MVP gate in [deploy timing analysis](2026-11-01-deploy-timing-analysis.md) |
| 1.3.x | Profit, potential revenue, notifications; fixes from real use | sprint reviews |
| **2.0.0** | Redesigned frontend, "What's new", design system | §3 exit criteria |

SemVer rules for an app: **major** = user-visible redesign or breaking API
change; **minor** = new feature; **patch** = fix. API compatibility is protected
by the `/api/v1` prefix (PR-56): a breaking API change means `/api/v2`, not a
surprise.

Release steps (each time): update `CHANGELOG.md` · tag · GitHub Release
(copy of the changelog section) · manual deploy via the `production`
environment · post-deploy checks · add the user-facing entry to What's new.

---

## 3. Pickle Rick 2.0: redesign and "What's new"

### 3.1 Intent

Make Pickle Rick feel like a product: coherent, fast to use, on-theme (Rick &
Morty, per Business Rules "UI Rules") and *explain itself over time* through a
release history users can read. This is a **frontend** initiative; the backend
contract stays `/api/v1`, which is exactly why the API prefix and deploy
separation matter.

### 3.2 Non-goals (anti-scope)

- No new business rules smuggled in under "redesign"
- No change of backend, database or auth model
- No rewrite of the framework (stay React + Vite; replacing it teaches nothing here)

### 3.3 "What's new" — design

**What the user sees**
- A **What's new** page (`/whats-new`) listing releases newest first: version, date, a short human headline, and grouped bullets (*New · Improved · Fixed*)
- A small **"New" badge** in the nav when there's a release the user hasn't seen, cleared on visit
- The current version shown in the footer (links to the page)
- Admin- and player-relevant items can be tagged by role so each only sees what applies

**How it works (architecture)**

```
CHANGELOG.md  ──(developer-facing, Common Changelog format)──► GitHub Release notes
      │
      └─ curated by you ─► frontend/src/content/releases/  (one file per version:
                           headline + user-friendly bullets + optional screenshot)
                                      │ build step (Vite) bundles it
                                      ▼
                       /whats-new page  +  "New" badge (localStorage: lastSeenVersion)
```

- **Two audiences, two files, one source of truth per audience.** `CHANGELOG.md` (already mandated by `docs/claude-instructions.md` — Common Changelog) is for developers; `releases/*.md` is in plain, friendly language for users. Don't try to make one file serve both.
- **Static, no backend, no database.** Content ships with the frontend build, costs nothing on Vercel, and can't fail independently of the app. *Trade-off:* editing needs a redeploy. For a project releasing a few times a month that is fine; a CMS or DB table would add a moving part with no benefit now.
- Version injected at build time (`define` in Vite from `package.json`) and returned by the API's `/health`, so the UI and server can each show what's running.
- Backfill 1.0.0 and 1.1.0 from `git log`.

**Open design decisions** (yours — I'll bring options): tone of the copy (Rick-flavoured vs neutral), whether to show it as a page vs a modal on first login, how far back to backfill.

### 3.4 Redesign work, as epics for the backlog

Candidate breakdown, to be refined with you before anything is estimated:

| Epic | Contents |
| --- | --- |
| **2.0-A Discovery** | UI audit of today's screens; list of friction points from the dogfooding log; 3 personas (Player, Court Admin, you-as-operator); competitor/prior-art look at court-booking apps |
| **2.0-B Design foundations** | Design tokens (colour, type, spacing), light/dark, component inventory, accessibility baseline (WCAG 2.1 AA — keyboard, contrast, touch targets) |
| **2.0-C Component library** | Buttons, forms, calendar/slot picker, cards, modals, empty/error/loading states, toasts |
| **2.0-D Screen redesigns** | Landing · Auth · Player Dashboard & Play · My Bookings · Pasalo · Shop · Admin Dashboard · Court Detail · Inventory · Reports · Profile Settings |
| **2.0-E What's new** | §3.3 |
| **2.0-F Quality** | Playwright visual/regression coverage, responsive (phone-first for players), performance budget (Lighthouse), Speed Insights baseline |

**Ordering:** discovery and foundations first; screens in order of how often
you actually use them (from the dogfood log). Ship **incrementally behind the
same URL** (each merged screen is releasable), instead of a long-lived
redesign branch — short-lived branches are the agile choice and avoid a
big-bang merge.

### 3.5 2.0 exit criteria

- [ ] Every screen in the 2.0-D list redesigned or explicitly deferred with a reason
- [ ] Accessibility audit passes WCAG 2.1 AA on the primary flows
- [ ] Lighthouse performance/accessibility ≥ 90 on key pages; no regression in API
- [ ] Playwright suite green after redesign; no business-rule behaviour changed
- [ ] What's new live with backfilled history
- [ ] Before/after screenshots in README

---

## 4. Systems-thinking track

A parallel learning stream. Each sprint includes **one small learning item**
that is not a feature. Outputs live in the repo so they compound.

### 4.1 Artifacts to build (in `docs/architecture/` and `docs/adr/`)

| Artifact | What it teaches | First draft when |
| --- | --- | --- |
| **System context + container diagram** (C4 levels 1–2): you, players, admins, Vercel, Supabase, GitHub | What the system *is* and its boundaries | Sprint 1 |
| **Data-flow / sequence diagrams** for 4 flows: login, book a slot (auto vs manual), approve & auto-cancel others, delete account | How a user action moves through every part | Sprints 1–3 |
| **ADRs** (one page each: context, options, decision, consequences) | Trade-offs and the *why* — more valuable than the code | Every decision: Supabase+Vercel, custom auth, region, migrations, logging sink |
| **Failure-mode table** ("if X fails, what does the user see, and what do we do?"): Supabase paused, cold start, Storage down, pooler exhausted, bad deploy | Resilience and blast radius | Sprint 2 |
| **Threat model** (STRIDE-lite on the 4 flows) | Security as a property of the whole, not a feature | Sprint 3 |
| **Capacity & cost budget** (egress, storage, invocations vs free limits) | Constraints as design inputs | Sprint 2 |
| **Feedback-loop map**: CI, monitoring, dogfood log, retro → backlog | Systems that improve themselves | Sprint 4 |
| **Glossary** of terms you've met (pooler, RLS, idempotent, cold start, RPO/RTO…) | Vocabulary to talk to anyone | Continuous |

### 4.2 Concepts mapped to things you'll actually touch

| Concept | Where it shows up in Pickle Rick |
| --- | --- |
| Boundaries & contracts | `/api/v1`; frontend ↔ API; analytics read-only role |
| Defence in depth | RLS + least-privilege role + app auth checks + WAF |
| Stateful vs stateless | Serverless functions have no disk → uploads move to Storage |
| Pooling & back-pressure | Connection pooler; why transaction mode forbids prepared statements |
| Latency & locality | Vercel region vs Supabase region |
| Consistency & concurrency | Contested booking slots; unique partial index; last-unit purchases (PR-37) |
| Idempotency | Seed script; re-running a migration; retried requests |
| Failure & recovery | Pause, backup, restore drill, rollback (RPO/RTO) |
| Observability | Logs, request IDs, SLOs, error tracking |
| Evolution | Expand→contract migrations, API versioning, feature flags |
| Feedback loops | Sprint → release → What's new → usage → backlog |

### 4.3 Explain-back ritual

At sprint review, for each Done item you answer three questions **in your own
words** (written in the ticket; Claude may ask, may not answer for you):

1. What problem did this solve, and for whom?
2. What part of the system does it touch, and what else could it affect?
3. How would we know if it broke, and what would we do?

If you can't answer, that is a signal the item isn't understood — schedule a
walk-through with Claude (it draws a diagram and quizzes you) before moving on.

### 4.4 Guardrails against "vibe-coding drift"

- Every architectural choice has an **ADR you can read in two minutes**
- Business rules live in `docs/business-rules.md`; behaviour changes need a doc change first
- Tests describe behaviour (test case Ref Nos), so you can read *what the system promises* without reading code
- CI gates (lint, tests, secrets scan) mean you don't have to review every line to trust the baseline
- A monthly **architecture walk-through**: pick a flow, trace it end-to-end with Claude, find one thing that surprised you, write it in the retro

### 4.5 Reading list (small and deliberate)

1. *Thinking in Systems* — Donella Meadows (the vocabulary: stocks, flows, feedback loops)
2. *The Twelve-Factor App* (free, short) — configuration, statelessness, parity
3. *Designing Data-Intensive Applications* — Kleppmann, chapters 1, 3, 7 (reliability, storage, transactions) when you meet them in the code
4. *Release It!* — Nygard (stability patterns: timeouts, circuit breakers, bulkheads)
5. Google *SRE Book* — chapters on SLOs and postmortems

Read just-in-time, tied to what's in the sprint, not as a prerequisite.

---

## 5. Proposed sequence (first 6 sprints, adjustable)

| Sprint | Goal (outcome) | Contents |
| --- | --- | --- |
| **S1** | "I understand where I'm going and the repo is ready" | Merge/close current PR-36 work; ADR-001 Supabase+Vercel; SRS scope update (PR-60); PR-52 fail-fast config; C4 diagram; set up Supabase `qa`, Vercel projects, MFA, spend/limit awareness |
| **S2** | "The app runs unchanged on QA" | Migrations + RLS; storage abstraction; serverless entry; pooler config; protected QA deploy; failure-mode table |
| **S3** | "I can operate it" | Backups + restore drill; health/ready; logging + error tracking; uptime monitor; `pg_dump` workflow; threat model; fix deleted-token defect |
| **S4** | "I'm using it" | Dogfood scenarios; log defects/ideas; fix the worst; seed script (PR-57); PR-53/55 hardening |
| **S5–S6** | "The product is complete enough to launch" | Shop (PR-18…23) in slices; revenue view (PR-26/27/31) — re-plan from dogfood data |
| **S7+** | MVP gate → `v1.2.0` public → then 2.0 discovery | per the gate and §3 |

Sprint 1 is deliberately about *understanding and prerequisites*, not features.
Re-plan every Monday; the table is a hypothesis, not a promise.

---

## 6. Jira structure (created 2026-11-01)

**Key map.** Epics: PR-10 Cloud Deployment (renamed), PR-71 Pickle Rick 2.0,
PR-72 Systems Thinking & Architecture Docs, PR-73 MVP Launch. New tickets:
PR-74 to PR-98 (cloud, defect, hardening), PR-99/100 (quality), PR-101/102
(docs), PR-103 to PR-108 (2.0), PR-109 to PR-112 (systems thinking),
PR-113/114 (dogfooding, MVP gate). The deleted-token defect is **PR-92**.
Sixteen existing tickets were updated with dated "Update 2026-11-01" sections
(PR-25, 26, 37, 52, 53, 54, 55, 56, 57, 58, 60, 62, 63, 64, 65, 66). Not
done via Jira tooling: statuses (`Ready`, `Review`, `Idea`), sprint board and
a dedicated sprint, which are board settings. Existing tickets already carry
`sprint-N` labels; that convention was left untouched.

The original proposal follows for reference.

- New epics: **Platform: Supabase + Vercel** (child of/aligned with PR-10), **Pickle Rick 2.0**, **Systems Thinking & Architecture Docs**
- New labels: `idea`, `dogfood`, `adr`, `runbook`, `security`, `learning`
- Re-scope PR-63/64/65, link PR-66 dependencies (see migration plan §3, §7)
- Add a sprint board (1-week sprints) and a `Review` status if missing

## 7. Open questions — answers (2026-11-01)

1. **Version numbers** — you don't remember the history, so the repo is the
   record: only two tags exist, `v1.0.0` ("Initial Release", 2026-08-03) and
   `v1.1.0` ("UI Revamp", 2026-08-04). Everything since (booking defects,
   Postman suite, CI/CD, account deletion, Pasalo fixes) is untagged. Plan:
   **backfill** the changelog from git history and treat `v1.2.0` as the MVP
   launch, unless you prefer a different number. *Status: default accepted,
   revisit at the MVP gate.*
2. **1-week sprints** — confirmed.
3. **Redesign references** — deferred. You will bring AI-generated samples
   (Codex, Claude Design) later; 2.0-A Discovery starts from the dogfood log
   and picks up those samples when they exist.
4. **Explain-back ritual** — **Light level chosen** (2026-11-01): only for
   items that change architecture, data, security or operations; bullet-point
   answers; ~10 min per sprint. Definition below.

### Related decision: k6 load testing stays, with a changed purpose

Cloud deployment does not make k6 obsolete; it changes what k6 is *for*.
- **Keep (local Docker):** PR-36 baseline as a regression baseline, and PR-37
  contention scenarios (double-booking a slot, last-unit purchase). Those test
  *correctness under concurrency*, which depends on our SQL and constraints,
  not on the host. Do PR-37 **before** the Shop is built.
- **Change:** numbers from local Docker do not predict cloud performance
  (cold starts, pooler, region). Don't use them for capacity claims.
- **Cloud:** only a light k6 smoke against QA, never load/stress against free
  tiers (check each vendor's load-testing policy first).

### Explain-back ritual (definition)

At the end of each sprint, for each item that reached Done, you write three
short answers **in your own words** in the Jira ticket:

1. What problem did it solve, and for whom?
2. What parts of the system does it touch, and what else could it affect?
3. How would we know if it broke, and what would we do?

Purpose: with AI writing the code, "it works" and "I understand it" come
apart. Writing the answers is how you notice the gap. If you can't answer,
Claude walks you through it with a diagram and a few questions; the item then
counts as understood.

| Level | What it means | Cost |
| --- | --- | --- |
| **Light (proposed default)** | Only for items that change architecture, data, security or operations (roughly 1–2 per sprint); answers can be bullet points | ~10 min per sprint |
| Full | Every Done item | ~30 min per sprint |
| Optional | Only when you ask for it | none, but the learning benefit mostly disappears |
