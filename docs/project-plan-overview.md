# Pickle Rick — Project Plan Overview

**Prepared:** 09 August 2026
**Purpose:** Single source of truth for what is built, what is left, and how
the remaining work maps to a Jira board.
**Verified against:** the working tree at commit `ef72be2` (branch `qa`) —
every status below was checked against actual code, schema, and config, not
inferred from the requirement docs.

**Relationship to other docs:**

- The five docs in `docs/` (BRD, Business Rules, SRS, Use Cases, Claude
  Instructions) describe *requirements* — what Pickle Rick should do.
- [`roadmap.md`](roadmap.md) is the running *implementation status* log, updated
  as work lands.
- **This document** is the *delivery plan*: status plus a prioritised,
  Jira-importable backlog with acceptance criteria. When status changes,
  update `roadmap.md`; when scope or sequencing changes, update this file.

---

## 1. Status Legend

| Tag | Meaning |
|---|---|
| ✅ `DONE` | Verified present and wired end to end |
| 🟡 `PARTIAL` | Built, but a stated rule or edge case is not covered |
| 🔨 `TODO` | Not started, in scope |
| 🐞 `DEFECT` | Built, but behaves against a documented rule |
| 💡 `STRETCH` | Post-MVP / portfolio differentiator |

---

## 2. Corrections to the Prior Status Draft

An earlier status document was written without repository access and marked
many items `⚠️ VERIFY`. Those have now been resolved against the code. Several
were materially wrong in **both** directions, so they are recorded here rather
than silently overwritten:

| Item | Prior claim | Verified reality |
|---|---|---|
| `analytics-service-python/` | "✅ Scaffolded, thin" | **Does not exist.** The service block is commented out in `docker-compose.yml` |
| GitHub Actions (3 pipelines) | "✅ Complete" | **No `.github/` directory at all.** Zero CI |
| Postman collection | "⚠️ VERIFY — harness exists" | **Does not exist.** No `testing/postman/` |
| k6 performance scripts | "⚠️ VERIFY — harness exists" | **Does not exist.** No `testing/k6/` |
| `README.md` | "🔨 TODO (add screenshots)" | **File does not exist**, though `CLAUDE.md` points readers to it |
| Account deletion | "🔨 TODO" | **✅ Done** — backend + frontend, `DELETE /api/auth/me` |
| Logout | "⚠️ VERIFY" | **✅ Done** — NavBar + AuthContext, with Playwright coverage |
| Profile photo upload | "🔨 TODO" | **✅ Done** — `POST /api/auth/me/photo` + multer middleware |
| Inventory management | "🎓 Reserved learning exercise, not started" | **✅ Done** — full CRUD, court-ownership scoped, admin UI built |
| Location-based court visibility | "🔨 TODO" | **✅ Done** — `findCourtsByLocation` + index |
| Consecutive-slot merging | "🔨 TODO" | **✅ Done** — `groupConsecutiveBookings` in `PlayerDashboard.jsx` |
| 8-player Pasalo cap | "🔨 TODO" | **✅ Done** — `MAX_PLAYERS_PER_BOOKING`, enforced on request *and* approve |
| Auto-cancel competing bookings | "🔨 TODO" | **✅ Done** — `cancelOtherPendingBookingsForSlot` |
| Business Rules doc titled "ClockWise" | Doc defect D1 | **Not reproducible** — the doc is correctly titled |

> **Net effect:** the *product surface* is considerably further along than the
> prior draft assumed, and the *platform/tooling* is considerably further
> behind. The remaining work is concentrated in purchasing, analytics, CI, and
> test coverage — not in the booking engine.

---

## 3. Executive Snapshot

| Area | State | Evidence |
|---|---|---|
| Database schema | ✅ Complete | `db/schema.sql` — 7 tables, partial unique index, FK cascades |
| Docker local environment | ✅ Complete | `docker-compose.yml` — postgres, backend, frontend, pgadmin |
| Auth & accounts (register/login/JWT/logout/photo/delete) | ✅ Complete | `authController.js`, `authRoutes.js` |
| Court management | 🟡 Core done | Duplicate-name rule unenforced |
| Booking engine | 🟡 Core done | Approve/cancel lack court-ownership checks |
| Pasalo join requests | ✅ Complete | Cap enforced at both entry points |
| Inventory management | ✅ Complete | `itemController.js` — ownership-scoped CRUD |
| Frontend (React/Vite + theme) | ✅ Complete for built features | 7 pages, 14 components, custom theme |
| Shop & purchasing | 🔨 Not started | `orders`/`order_items` tables exist; **no** model, controller, route, or page |
| Analytics service (FastAPI) | 🔨 Not started | Directory absent; `AdminReports.jsx` is an honest placeholder |
| Playwright E2E | 🟡 Framework done, coverage thin | POM + fixtures built; **1 spec file, 5 tests**, Auth module only |
| Postman / k6 | 🔨 Not started | Directories absent |
| CI/CD | 🔨 Not started | No `.github/workflows/` |
| `README.md` | 🔨 Not started | Referenced by `CLAUDE.md`, does not exist |
| Cloud deployment | 🔨 Not started | SRS currently constrains to local only |
| AI feature | 💡 Not started | Not in any requirement doc |

**Honest completion estimate:** functional requirements FR-01 through FR-12 are
**~85% delivered** (FR-05 purchasing and FR-09 revenue are the two outstanding).
Non-functional and process work — testing, CI, deployment, docs — is **~15%
delivered** and is now the critical path for a portfolio piece.

---

## 4. Requirements Traceability

### 4.1 Authentication & Accounts — ✅ Complete

| Req | Item | Status | Evidence |
|---|---|---|---|
| BR-01, FR-01, UC-01/02 | Login + registration pages | ✅ | `Login.jsx`, `Register.jsx` |
| BR-02 | Role selection at registration | ✅ | `users.role` CHECK constraint |
| FR-01 | JWT role-gated access | ✅ | `authMiddleware.js` — `requireAuth`, `requireRole` |
| FR-11 | Logout | ✅ | `NavBar.jsx` + `AuthContext.jsx`; AUTH-03-001/002 automated |
| UC-01/02 | Profile photo upload | ✅ | `POST /api/auth/me/photo`, `upload.js` |
| BR-08, FR-12, UC-06 | Account deletion w/ password re-prompt | ✅ | `deleteMe`, transactional, role-specific UI warning |

### 4.2 Court Management

| Req | Item | Status | Notes |
|---|---|---|---|
| BR-05, UC-03 | Admin court list + add court | ✅ | `listMyCourts`, `createCourt` |
| UC-03 | Name, address, location, hourly rate (PHP), approval type | ✅ | All six columns present and captured |
| BR-04, FR-02 | Per-court auto/manual approval toggle | ✅ | `courts.approval_type` |
| Rules §Booking | Players see only their own location's courts | ✅ | `findCourtsByLocation` + `idx_courts_location` |
| Rules §Admin | **One court per name per admin** | 🐞 **DEFECT** | No unique constraint, no controller check |
| BRD §Processes | Admin cancels a player's booking | 🟡 | Works, but any admin can cancel any court's booking — see §5 |

### 4.3 Booking Engine

| Req | Item | Status | Notes |
|---|---|---|---|
| BR-03, UC-05-01 | Book an hour slot | ✅ | `createBooking` |
| BR-06 | "My Bookings" page | ✅ | `listMyBookings` + Player Dashboard |
| FR-03 | Auto-approval path | ✅ | `approval_type === 'auto' ? 'approved' : 'pending'` |
| FR-04, UC-05-02 | Manual-approval queue | ✅ | `listBookingsForCourt` + admin accordion |
| UC-05-02 (Admin) | Approving one player cancels competitors | ✅ | `cancelOtherPendingBookingsForSlot` |
| Rules §Booking | Consecutive slots merged in UI | ✅ | `groupConsecutiveBookings` |
| — | Double-booking prevention (approved slots) | ✅ | Partial unique index `idx_bookings_slot_approved` |
| FR-06 | **Block requests on already-approved slots** | 🐞 **DEFECT** | See §5 — the guard doesn't fire |
| UC-05-02 | Approve + cancel-competitors in one transaction | 🟡 | Two sequential queries, not atomic |

### 4.4 Pasalo (Join Requests) — ✅ Complete

| Req | Item | Status |
|---|---|---|
| FR-08 | Player B requests to join Player A's booking | ✅ |
| FR-07 | Approved joiners shown as "Players" | ✅ |
| Rules §Pasalo | Approve/decline panel on Player dashboard | ✅ |
| Rules §Pasalo | 8-player hard cap | ✅ (enforced on request *and* approval) |
| UC-05-02 | Notify player on approval | 🔨 TODO — no notification system exists |

### 4.5 Inventory Management — ✅ Complete

| Req | Item | Status |
|---|---|---|
| FR-10, UC-04 | Admin inventory page (add/remove/update qty) | ✅ `AdminCourtDetail.jsx` |
| UC-04 | Item fields: name, details, photo, quantity, price PHP | ✅ all present in `items` |
| Rules §Admin | Inventory scoped per court + per owning admin | ✅ `loadOwnedCourtOr403` |

### 4.6 Shop & Purchasing — 🔨 The largest remaining feature

| Req | Item | Status |
|---|---|---|
| BR-07, FR-05 | Browse court inventory, add to cart | 🔨 |
| BR-07 | Purchase in advance, pick up at court | 🔨 |
| Rules §Purchasing | Only that court's items are purchasable | 🔨 |
| — | Stock decrement + oversell prevention (transactional) | 🔨 |
| — | Player order history; admin fulfilment view | 🔨 |

Schema is ready (`orders`, `order_items` with `unit_price_php` price snapshot).
**Nothing reads or writes these tables yet** — no model, controller, route, or page.

### 4.7 Dashboard & Analytics — 🔨 Not started

| Req | Item | Status |
|---|---|---|
| FR-09 | Admin total revenue across all courts, per month | 🔨 |
| BRD §Metrics | Revenue **and profit** per court, past + current month | 🔨 |
| BRD §Metrics | Potential revenue from current + advance bookings | 🔨 |
| SRS §Environment | FastAPI analytics service (read-only) | 🔨 |

> **Blocking design gap:** profit is a stated key metric, but the schema has no
> cost field anywhere. Profit is **not computable** today. This needs a decided
> cost model (item cost price, plus court operating cost per hour or per month)
> and a schema migration *before* the analytics service is worth building.

### 4.8 Non-Functional

| Req | Item | Status | Notes |
|---|---|---|---|
| NFR-01 | Handle concurrent requests | 🟡 | DB-level slot exclusivity is sound; never load-tested |
| NFR-02 | Clean code principles | ✅ | Consistent controller/model split, thorough comments |
| NFR-03 | Safe for public GitHub | 🟡 | `.gitignore` correctly excludes `.env`, `credentials.json`, uploads, test artifacts. Dev passwords are hardcoded in `docker-compose.yml` (acceptable for local, must not survive deployment) |

### 4.9 Platform & DevOps

| Item | Status |
|---|---|
| Branching: `main` / `qa` / prefixed local branches | ✅ Followed consistently in history |
| Commit convention `[Type]: description` | ✅ Followed consistently |
| Docker Compose, non-headless, bind mounts + hot reload | ✅ |
| Postgres init via `/docker-entrypoint-initdb.d/` | ✅ |
| Playwright framework (POM, fixtures, headful, screenshots) | ✅ |
| Playwright coverage | 🟡 Auth module only (5 tests) |
| Postman collection | 🔨 |
| k6 scripts | 🔨 |
| GitHub Actions (Development / QA / Main) | 🔨 |
| `README.md` | 🔨 |
| Seed / demo data script | 🔨 |
| Cloud deployment | 🔨 |

---

## 5. Defects Found During Verification

These are **not** roadmap items — they are existing code behaving against a
documented rule. Listed most severe first.

**DEF-1 — Booking endpoints missing court-ownership checks (access control).**
`approveBooking`, `cancelBooking`, and `listBookingsForCourt` gate on
`requireRole('admin')` but never check that the court belongs to
`req.user.id`. Any logged-in admin can read, approve, and cancel bookings on
**another admin's** courts. `itemController.js` already solves exactly this with
`loadOwnedCourtOr403` — and its comment explicitly warns that `requireRole('admin')`
alone "would let ANY admin edit ANY court's items, which is wrong." The same
pattern simply wasn't applied to bookings. Violates BR-05 and NFR-03.

**DEF-2 — FR-06 not enforced; stale comment masks it.**
`createBooking` only blocks the *same* player from re-requesting a slot. A
different player can still create a `pending` booking on a slot that is already
`approved`. The code comments claim a `UNIQUE(court_id, booking_date, start_hour)`
constraint catches this, but the actual index in `schema.sql` is **partial**
(`WHERE status = 'approved'`), so inserting a pending row never trips it. FR-06
says players may only book slots "not yet tagged as approved."

**DEF-3 — Duplicate court names allowed.**
Business Rules: "Admins can only add one court with a given Court Name." Neither
a DB constraint nor a controller check exists.

**DEF-4 — Approval is not atomic.**
`approveBooking` runs `updateBookingStatus` then
`cancelOtherPendingBookingsForSlot` as two separate queries. A crash between them
leaves an approved booking with live competing pending requests.

**DEF-5 — `orders.status` CHECK excludes its own DEFAULT.**
`schema.sql` declares `status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('placed','picked_up','cancelled'))`.
`'pending'` is not in the allowed list, so **any insert that omits `status` fails**.
Latent today because nothing writes to `orders` — it will break the first
checkout call written.

**DEF-6 — Doc defects.** UC-05-02 is used as the ID for both the Player and the
Admin flow (already flagged inline in the use-case doc); SRS constrains the
project to local deployment, which conflicts with any cloud-deployment goal.

---

## 6. Jira-Ready Backlog

**This backlog is live.** It was created in Jira on 09 August 2026 as project
**Pickle Rick** (key `PR`) at `pickle-rick.atlassian.net` — 10 epics and 58
child issues, every child parented to its epic, all in **To Do**.

The keys below are the real issue keys. `PR-1` is absent: it was a throwaway
connectivity test, since deleted, and Jira does not reuse keys.

| Epic | Key | Children |
|---|---|---|
| Defect Remediation | `PR-2` | PR-12 … PR-17 |
| Shop & Purchasing | `PR-3` | PR-18 … PR-23 |
| Analytics & Reporting | `PR-4` | PR-24 … PR-31 |
| Notifications | `PR-5` | PR-32 … PR-34 |
| Quality Engineering | `PR-6` | PR-35 … PR-44 |
| CI/CD | `PR-7` | PR-45 … PR-51 |
| Hardening & Production Readiness | `PR-8` | PR-52 … PR-57 |
| Documentation | `PR-9` | PR-58 … PR-62 |
| Cloud Deployment | `PR-10` | PR-63 … PR-66 |
| AI Feature | `PR-11` | PR-67 … PR-69 |

Priorities follow Jira defaults: Highest / High / Medium / Low. The summaries
below are abbreviated — each Jira issue carries the full context, acceptance
criteria, affected file paths, and dependency notes.

### Epic PR-2 — Defect Remediation `defect` `security`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-12 | Add court-ownership check to booking approve / cancel / list endpoints | Bug | Highest | DEF-1, BR-05, NFR-03 |
| PR-13 | Enforce FR-06 — reject booking requests on already-approved slots | Bug | High | DEF-2, FR-06 |
| PR-14 | Enforce one court name per admin | Bug | Medium | DEF-3, Rules §Admin |
| PR-15 | Wrap booking approval and competitor cancellation in one transaction | Bug | Medium | DEF-4, UC-05-02 |
| PR-16 | Fix `orders.status` CHECK constraint excluding its own DEFAULT | Bug | Medium | DEF-5, BR-07 |
| PR-17 | Correct stale unique-constraint comments in `bookingController` | Task | Low | DEF-2, NFR-02 |

**PR-12** is the one to do first. Extract a shared `loadOwnedCourtOr403`-style
helper — `itemController.js` already has it, and its own comment explains why
`requireRole('admin')` alone is insufficient.

### Epic PR-3 — Shop & Purchasing (BR-07) `feature`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-18 | Decide the cart state model — client-only vs. server-persisted | Spike | High | BR-07, FR-05 |
| PR-19 | Build `Order` model and `orderController` | Story | High | BR-07, FR-05, NFR-02 |
| PR-20 | Checkout endpoint — create order, decrement stock, reject oversell | Story | High | BR-07, FR-05, NFR-01 |
| PR-21 | Player shop page — browse court inventory and build a cart | Story | High | FR-05, Rules §Purchasing |
| PR-22 | Player order history with pickup status | Story | Medium | BR-07, BR-08 |
| PR-23 | Admin order fulfilment view — mark orders picked up | Story | Medium | BR-07, FR-10 |

**PR-20 is the hardest correctness problem in the epic.** A single transaction
with `SELECT … FOR UPDATE`; concurrent purchases of the last unit must yield
exactly one success and one clear out-of-stock error, with stock never negative.
**Blocked by PR-16** — the `orders.status` defect fails the first insert.

### Epic PR-4 — Analytics & Reporting (FR-09) `analytics`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-24 | Decide the profit cost model — gates the entire epic | Spike | High | BRD §Key Metrics |
| PR-25 | Schema migration adding the agreed cost fields | Task | High | BRD §Key Metrics |
| PR-26 | Scaffold `analytics-service-python` (FastAPI + psycopg2) | Story | High | SRS §Operating Environment |
| PR-27 | `GET /revenue/{admin_id}` — revenue per court, current and past months | Story | High | FR-09, NFR-03 |
| PR-28 | Profit per court per month | Story | Medium | BRD §Key Metrics |
| PR-29 | Potential revenue from pending and advance bookings | Story | Medium | BRD §Key Metrics |
| PR-30 | Re-enable `analytics-python` in `docker-compose.yml` | Task | High | Claude Instructions §Environment |
| PR-31 | Wire `AdminReports.jsx` to live data with themed charts | Story | Medium | FR-09, Rules §UI |

**PR-24 is a hard gate.** Profit is not computable from the current schema —
there is no cost field anywhere. Starting the FastAPI service first means
rewriting it. Deciding profit is out of scope is a legitimate outcome, provided
it is written down.

### Epic PR-5 — Notifications `feature` `spec-gap`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-32 | Add an explicit notification functional requirement to the SRS | Task | Medium | UC-05-02, SRS gap |
| PR-33 | In-app notifications for booking approval and cancellation | Story | Medium | UC-05-02, BR-08 |
| PR-34 | In-app notifications for Pasalo requests and responses | Story | Medium | FR-07, FR-08 |

**PR-33 fixes a real silent failure.** When an admin approves one player, every
competing booking is cancelled and those players are told nothing — they find
out on arrival at the court.

### Epic PR-6 — Quality Engineering `qa`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-35 | Postman collection covering all endpoints, with teardown | Story | High | SRS §Purpose |
| PR-36 | k6 baseline load script with `teardown()` | Story | High | NFR-01 |
| PR-37 | k6 contention scenarios — booking slots and last-unit purchases | Story | High | NFR-01, FR-06, BR-07 |
| PR-38 | Playwright specs — Court Management module | Story | High | UC-03, UC-04 |
| PR-39 | Playwright specs — Player Bookings module | Story | High | BR-03, BR-06, FR-03/04/06 |
| PR-40 | Playwright specs — Booking Acceptance module | Story | High | UC-05-02, FR-04 |
| PR-41 | Playwright specs — Pasalo module | Story | High | FR-07, FR-08 |
| PR-42 | Add teardown hooks to all Playwright specs | Task | High | CLAUDE.md §Testing |
| PR-43 | Negative authorization test suite | Task | High | NFR-03, BR-05, BR-08 |
| PR-44 | Backfill the `Automation Script` column in the test-case tracker | Task | Medium | Claude Instructions §Testing |

The Playwright framework (POM, fixtures, headful config, screenshots) already
works and should not be rebuilt — these tickets are **coverage**, not setup.

### Epic PR-7 — CI/CD `devops` `ci-cd`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-45 | Development pipeline — lint and build on prefixed branches | Story | High | Claude Instructions §Actions |
| PR-46 | QA pipeline — Postman and Playwright against a live stack | Story | High | Claude Instructions §Actions |
| PR-47 | Main pipeline — full gate before production merge | Story | High | Claude Instructions §Actions |
| PR-48 | ESLint and Prettier for `backend-node` and `frontend` | Task | Medium | NFR-02 |
| PR-49 | Ruff for `analytics-service-python` | Task | Low | NFR-02 |
| PR-50 | Husky and lint-staged pre-commit hooks | Task | Low | Claude Instructions |
| PR-51 | Switch branch merges to PR-based and update the docs | Task | Medium | CLAUDE.md §Git |

**PR-51 closes a documented loop.** `CLAUDE.md` states PRs are deliberately
skipped *until the pipelines exist* — that reasoning expires here.

### Epic PR-8 — Hardening & Production Readiness `devops` `security`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-52 | Fail fast on missing configuration at boot | Task | High | NFR-03 |
| PR-53 | Add `helmet` and rate limiting on auth endpoints | Task | High | NFR-03 |
| PR-54 | Replace console logging with structured logging | Task | Medium | NFR-02, NFR-03 |
| PR-55 | Secrets audit before making the repository public | Task | Highest | NFR-03, SRS §Purpose |
| PR-56 | Introduce an `/api/v1` prefix | Task | Medium | Claude Instructions |
| PR-57 | Seed and demo data script with a reset command | Story | High | Business Rules, SRS §Purpose |

**PR-56 has a timing constraint** — do it before PR-35 and the Playwright module
specs, or every collection and spec is rewritten immediately after.
**PR-57 unblocks three things at once**: cheap resets after schema changes,
demo data, and screenshots for the README.

### Epic PR-9 — Documentation `docs`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-58 | Write `README.md` — architecture, setup, and screenshots | Story | Highest | SRS §Purpose, CLAUDE.md |
| PR-59 | Renumber the Admin booking flow from UC-05-02 to UC-05-03 | Task | Medium | DEF-6 |
| PR-60 | Update SRS scope and constraints if cloud deployment is adopted | Task | Medium | DEF-6, SRS §Scope |
| PR-61 | Document the profit cost model in the SRS and schema | Task | Medium | BRD §Key Metrics |
| PR-62 | Keep `CLAUDE.md` and the status docs in sync as modules land | Task | Low | CLAUDE.md |

**PR-58 is the highest-value single ticket in this backlog for portfolio
purposes.** `CLAUDE.md` directs readers to a `README.md` that does not exist —
the first thing a visitor to the repository hits is a dead reference.

### Epic PR-10 — Cloud Deployment `devops` `stretch`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-63 | Choose a host and document the 12-month billing risk | Spike | Medium | SRS §Scope |
| PR-64 | Decide managed vs. containerised Postgres, and a backup approach | Spike | Medium | SRS §Scope, NFR-03 |
| PR-65 | Right-size containers for a small free-tier instance | Task | Medium | SRS §Constraint |
| PR-66 | Deploy pipeline from `main` to the chosen host | Story | Medium | Claude Instructions, NFR-03 |

Adopting this epic means **deliberately changing** the SRS, which currently
states the project is local-deployment only. PR-60 carries that change.

### Epic PR-11 — AI Feature `ai` `stretch`

| Key | Summary | Type | Priority | Traces |
|---|---|---|---|---|
| PR-67 | Decide the AI feature — slot recommender vs. support chatbot | Spike | Low | — |
| PR-68 | Build the chosen AI feature | Story | Low | — |
| PR-69 | Document prompt design, evaluations, and cost/latency notes | Task | Low | — |

Pure stretch scope — this appears in **no requirement document**. Pick one and
do it properly: PR-69 is what distinguishes engineering from prompting.

---

## 7. Suggested Sequence

Each issue carries a `sprint-N` label matching this table, so the board can be
filtered into sprints without re-reading the plan.

| Sprint | Focus | Epics | Rationale |
|---|---|---|---|
| 1 | Defect remediation | `PR-2` | Six small, well-understood tickets. Closes a real access-control hole and gives a clean baseline before new features |
| 2 | Shop & purchasing | `PR-3` | Last unbuilt functional requirement; schema already waiting |
| 3 | Analytics & reporting | `PR-4` | Needs sales data from Sprint 2 to produce complete revenue |
| 4 | Test coverage | `PR-6` | Do this once the feature set is stable, so specs aren't rewritten |
| 5 | CI/CD + hardening | `PR-7`, `PR-8` | Pipelines need the suites from Sprint 4 to be worth running |
| 6 | Documentation | `PR-9` | Write once the architecture stops moving — but pull PR-58 forward if the repo goes public sooner |
| 7 | Deployment | `PR-10` | Late, but before the AI feature, so there's a live URL even if AI slips |
| 8 | AI feature + notifications | `PR-11`, `PR-5` | Genuinely optional scope |

Four dependencies that cut across the sprint order:

- **PR-58 (`README.md`) can be pulled into any sprint.** Nothing blocks it, and
  it is the highest-visibility gap in the repo right now. Its only soft
  dependency is PR-57 (seed data), for screenshots worth taking.
- **PR-16 must land before PR-20.** The `orders.status` CHECK/DEFAULT mismatch
  will fail the very first checkout insert.
- **PR-24 gates all of `PR-4`.** Profit is not computable until the cost model
  is decided; building the analytics service first means rewriting it.
- **PR-56 (`/api/v1` prefix) should land before PR-35 and the Playwright module
  specs**, or every collection and spec gets rewritten immediately after.

---

## 8. The Jira Board

**Site:** `pickle-rick.atlassian.net` · **Project:** Pickle Rick (`PR`) ·
**Type:** Team-managed Scrum

**What was created — 68 issues:**

| Issue type | Count | Used for |
|---|---|---|
| Epic | 10 | The workstreams in §6 |
| Story | 25 | User-facing functionality |
| Task | 21 | Engineering and process work |
| Bug | 5 | The verified defects in §5 |
| Spike | 5 | Timeboxed decisions that gate other work |

Two work types were added to the project for this backlog: **Spike** (used for
the five decision-gates) and **Research** (available, not yet used — reserve it
for open-ended investigation, keeping Spike for decisions that block delivery).

**Ticket anatomy.** Every issue follows the same shape so it can be picked up
without re-reading this document:

- **Goal / Problem** — what and why, in prose
- **Context** — current state, verified against the code
- **Acceptance criteria** — a checklist, not a paragraph
- **Files** — the actual paths involved
- **Depends on** — named blockers
- **Traces** — the requirement IDs (BR/FR/NFR/UC), matching the code-comment
  convention in `CLAUDE.md`

**Label taxonomy** — for filtering the board without opening tickets:

| Dimension | Labels |
|---|---|
| Nature of work | `defect`, `feature`, `decision`, `process` |
| Component | `backend`, `frontend`, `database`, `analytics`, `python`, `docker` |
| Discipline | `security`, `qa`, `devops`, `ci-cd`, `docs`, `observability`, `architecture` |
| Tooling | `postman`, `k6`, `playwright`, `e2e`, `tooling` |
| Planning | `sprint-1` … `sprint-6`, `stretch`, `portfolio`, `spec-gap` |

Useful filters: `labels = security` surfaces every ticket that touches
authorization or secrets; `labels = stretch` excludes optional scope from
velocity; `labels = decision` lists the five spikes gating other work.

**Maintaining this document.** The board is now the operational source of truth
for *status*. This file stays the source of truth for *why the plan looks the
way it does* — the verification evidence in §2–§5 and the sequencing rationale
in §7. When a defect in §5 is fixed, update it here as well as in Jira, so the
next reader is not told about a bug that no longer exists.

---

*Cross-reference: [business-requirements.md](business-requirements.md),
[business-rules.md](business-rules.md),
[software-requirements-specification.md](software-requirements-specification.md),
[use-case-specification.md](use-case-specification.md),
[claude-instructions.md](claude-instructions.md), [roadmap.md](roadmap.md).*
