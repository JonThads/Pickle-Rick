# Pickle Rick — Scale-Up Roadmap

*Reference doc — snapshot of what's built vs. what's left, checked against
the five docs in `docs/` (BRD, Business Rules, SRS, Use Cases,
claude-instructions) as of 2026-08-04.*

This is a living document. Update the checkboxes/notes as work lands —
don't let it drift out of sync with reality the way the "5 docs" can't
(those describe *requirements*; this describes *implementation status*).

---

## 1. What's already done

### Backend (`backend-node/`)
- [x] Auth: register, login, `GET/PATCH /me`, profile photo upload (BR-01,
  BR-02, FR-01)
- [x] Courts: create, list mine, list by player location, per-day
  availability (BR-04, BR-05, FR-02)
- [x] Bookings: create (auto vs. manual approval), list mine, list for
  court, approve, cancel (BR-03, BR-04, FR-03–FR-06, UC-05-01, UC-05-02)
- [x] Pasalo: request to join, approve/disapprove, incoming/outgoing
  lists, 8-player cap enforced (FR-07, FR-08, Pasalo rule)
- [x] Inventory: item CRUD scoped to the owning admin (UC-04, FR-10 — data
  management half of BR-07)
- [x] `db/schema.sql`: `users`, `courts`, `items`, `bookings`,
  `booking_players`, `orders`, `order_items` — note the last two exist in
  the schema already but nothing reads/writes them yet (see §2)

### Frontend (`frontend/`)
- [x] Login / Register (role picker: Player or Admin)
- [x] Player Dashboard: calendar + hourly slot picker, consecutive-slot
  merging in the UI, "My Bookings", Pasalo incoming/outgoing panels
- [x] Admin Dashboard: court list, "Add court" form
- [x] Admin Court Detail: per-hour booking accordion (approve slots),
  inventory management UI
- [x] Profile Settings (edit profile, photo)
- [x] Logout (NavBar / AuthContext)
- [x] Account deletion in Profile Settings (BR-08, FR-12, UC-06)
- [x] Nav/sidebar shell, Rick & Morty-inspired visual theme ("UI Revamp"
  commit)

### Infra
- [x] `docker-compose.yml`: postgres, backend-node, frontend, pgadmin —
  runs non-detached per `docs/claude-instructions.md`
- [x] Dockerfiles for `backend-node` and `frontend`

### Testing (`testing/`)
- [x] Postman collection + environment — self-registering `pm-` prefixed
  accounts, `psql`-based teardown (Auth, Court Management, Player
  Bookings coverage started; not every endpoint yet)
- [x] k6 smoke test (`testing/k6/smoke-test.js`)
- [x] Playwright + TS suite (`testing/playwright/`) — Auth module only
  (5 tests) so far; headful locally, headless in CI via
  `process.env.CI`; `global-setup.ts`/`global-teardown.ts` self-register
  and tear down named test accounts against the live API, mirroring
  Postman's `pm-` convention with a `pw-` prefix

### CI/CD (`.github/workflows/`)
- [x] Development pipeline — lint/build/boot-check, fires on
  `feature/**`/`fix/**`/`test/**`/`chore/**`/`docs/**`/`refactor/**`/`ci/**`
  pushes
- [x] QA pipeline — full Postman + Playwright suite against a fresh
  `docker compose` stack, gates PRs/pushes into `qa`, publishes the
  Playwright HTML report to GitHub Pages on push
- [x] Main pipeline — QA's suite plus k6, a Docker image build check,
  and a Gitleaks secrets scan, gates PRs/pushes into `main`; optional
  manual `workflow_dispatch` tags a release (`vYYYY.MM.DD-<sha>`)
- [x] Branch protection on `main` requiring the suite / build-images /
  secrets-scan checks before merge
- [x] Merges are no longer manual and PRs are no longer skipped —
  `feature → qa → main` now goes through reviewed pull requests gated
  by these pipelines

---

## 2. What's remaining

### Backend — missing endpoints
- [ ] **Purchasing/checkout** (BR-07 second half: "purchase in advance,
  pick up at court"). `orders` / `order_items` tables already exist in
  `schema.sql` — no controller, model, or routes consume them yet. Needs
  cart→order flow, stock decrement against `items.quantity`, and an order
  status transition (`placed` → `picked_up` / `cancelled`).
- [x] **Account deletion** — `DELETE /api/auth/me` (BR-08, FR-12, UC-06).
  Hard delete, password re-confirmed, transactional, deletes child rows
  before parents so `order_items`' `ON DELETE RESTRICT` can't abort the
  cascade. Cascade behaviour is now written down in the Business Rules doc
  under "Account Deletion Rules". Frontend is wired up too — see below.
- [ ] **Potential revenue** data isn't exposed anywhere yet (BRD Key
  Metric: "Potential Revenue based on a month's current and advanced
  bookings") — likely lives in analytics-python once that exists, but
  worth deciding which service owns it now rather than later.

### `analytics-service-python/` — not started
The directory doesn't exist yet; the `analytics-python` service in
`docker-compose.yml` is commented out. `AdminReports.jsx` already points
at it (`GET /revenue/{admin_id}`), so the frontend contract is
effectively pre-agreed. Needs:
- [ ] FastAPI app skeleton + `psycopg2` connection (per CLAUDE.md: no ORM
  here either)
- [ ] `GET /revenue/{admin_id}` — revenue per court, current + past
  months (FR-09, BRD Key Metrics)
- [ ] Profit calculation — **schema currently has no cost/expense field**,
  so "profit" isn't computable yet; needs a schema decision (e.g. a cost
  basis on `items`, or a flat court operating cost) before this can be
  built
- [ ] Potential revenue calc (see above)
- [ ] Re-enable the `analytics-python` block in `docker-compose.yml` and
  add it back to `frontend`'s `depends_on`

### Frontend — missing pages/flows
- [ ] Player-facing shop: browse a court's items, cart, checkout (BR-07)
- [ ] Player order history / pickup status
- [ ] Wire up `AdminReports.jsx` to real data once analytics-python exists
  (currently a "Coming soon" placeholder — intentionally not faked)
- [x] "Delete account" in Profile Settings (UC-06) — two-step confirm with
  a password re-prompt, role-specific warning copy (an Admin is told their
  courts and other players' bookings go too), then logout and redirect to
  the landing page

### Docs
- [ ] `README.md` — CLAUDE.md says "See README.md for the full
  architecture writeup and setup instructions," but the file doesn't
  exist in the repo yet

---

## 3. Suggested build order

Roughly in dependency order — each phase unblocks testing/CI work for
everything built before it:

1. **Close out BR-07** (purchasing/checkout backend + player shop/cart
   UI) — the last unbuilt *functional* requirement, and the schema is
   already there waiting.
2. ~~**Account deletion**~~ — done, backend and frontend
   (`feature/account-deletion`, `feature/delete-account-ui`). Closes out
   the last BRD business process.
3. **`analytics-service-python`** — decide the profit data model first
   (needs a schema change), then build the FastAPI service, then
   re-enable it in `docker-compose.yml` and wire `AdminReports.jsx`.
4. **`README.md`** — write once the architecture stops moving quite so
   fast; document what actually got built, not just what was planned.
5. ~~**Testing suite**~~ — done (Postman → k6 → Playwright, in that
   order). Coverage is still partial (Auth module only for Playwright;
   not every endpoint in Postman/k6 yet) — that's ongoing work, not
   scaffolding.
6. ~~**CI/CD**~~ — done (GitHub Actions: Development/QA/Main, plus
   branch protection on `main`). PRs are no longer skipped.

---

*Cross-reference: [business-requirements.md](business-requirements.md),
[business-rules.md](business-rules.md),
[software-requirements-specification.md](software-requirements-specification.md),
[use-case-specification.md](use-case-specification.md),
[claude-instructions.md](claude-instructions.md).*
