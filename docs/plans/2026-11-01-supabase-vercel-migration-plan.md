# Supabase + Vercel Migration — Action & Implementation Plan

*Pickle Rick · drafted 2026-11-01 · status: PROPOSED (nothing implemented)*
*Jira: Epic PR-10 (Cloud Deployment). Cross-checked against `docs/roadmap.md`
and the 81 open issues in the `PR` project.*

---

## 1. Target architecture

| Today (local Docker) | Target | Notes |
| --- | --- | --- |
| `postgres:16-alpine` + `schema.sql` via initdb | **Supabase Postgres** | Managed; app connects through the **pooler**, not the direct host |
| `backend-node` Express on `:4000` | **Vercel project #1** (serverless function wrapping `app.js`) | `app.js` / `server.js` split already makes this cheap |
| `frontend` Vite dev server | **Vercel project #2** (static build) | `VITE_API_URL` baked in at build time |
| `backend-node/uploads/` on disk (multer) | **Supabase Storage** public bucket | Vercel's filesystem is read-only/ephemeral — *required change* |
| `analytics-service-python` (not built) | **Vercel project #3** (FastAPI), read-only DB role | Only after PR-4 exists |
| pgAdmin, Prometheus, Grafana | **Dropped in cloud**; kept locally | Vercel logs replace them |
| Docker Compose | **Stays for local dev + CI test runs** | Cloud is a deploy *target*, not a replacement |

Two Supabase projects (free tier allows two — verify): `pickle-rick-qa` and
`pickle-rick-prod`. `qa` branch → Vercel preview + QA project; `main` →
Vercel production + prod project.

## 2. Codebase findings that drive the plan

1. **Uploads break on Vercel.** `middleware/upload.js` uses `multer.diskStorage`;
   `app.js` serves `/uploads` statically; `authController.js:42` stores a
   *relative* `photo_url` and `Avatar.jsx` prepends `BASE_URL`. → switch to
   `memoryStorage` + upload to Supabase Storage, store the full public URL.
   Vercel request bodies are capped (~4.5 MB, verify) and the current limit
   is 5 MB → lower the cap to 4 MB.
2. **Pool + serverless.** `config/db.js` builds a default `Pool`. Each cold
   instance would open up to 10 connections. → use the Supabase **transaction
   pooler** (port 6543), `max: 1–3`, and TLS **with certificate verification on**
   (`ssl: { ca: <Supabase root CA from env> }`) — never disable verification. Existing `BEGIN…COMMIT` flows (approval, account deletion,
   upcoming checkout) hold one client for the whole transaction, so they work
   in transaction mode. The direct host is IPv6-only on Free (IPv4 needs a paid
   add-on), so Vercel and GitHub Actions (IPv4) must use a pooler. Transaction
   mode (6543) does **not** support prepared statements — `pg` only uses them
   when a query is given a `name`, so we simply never name queries. Session
   mode (5432, IPv4) is the right choice for `pg_dump` and migrations.
3. **Supabase exposes `public` tables via its Data API.** With RLS off, anyone
   holding the project's anon key can read `users.password_hash`. → add
   `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (no policies) on every table and
   disable the Data API if not needed. Our backend connects as `postgres` and
   bypasses RLS, so behaviour is unchanged. **This is the biggest silent
   security risk of the migration** (NFR-03).
4. **Auth stays custom (recommended).** JWT + bcrypt + `users` table is
   tested (Postman 147 requests, Playwright) and BR-08 deletion semantics depend
   on it. Supabase Auth would be a rewrite plus a data model change. Use
   Supabase purely as Postgres + Storage. Revisit only as a separate epic.
5. **Native `bcrypt`** works on Vercel's Linux runtime but is the usual
   packaging pain point; fall back to `bcryptjs` if the build fails (hash
   format is compatible).
6. **`prom-client` / `/metrics`** are meaningless per-invocation in serverless.
   Gate behind `NODE_ENV !== 'production'` or env flag.
7. **`express-rate-limit` default store is in-memory** → useless across
   serverless instances (PR-53). Needs Vercel WAF/Firewall rate limiting or a
   shared store (Upstash Redis / Postgres table).
8. **CORS is `cors()` wide open** → restrict to the frontend origin(s)
   (PR-66 checklist).
9. **Schema delivery.** `schema.sql` via `docker-entrypoint-initdb.d` is not a
   deployment strategy (PR-64). Need numbered migrations before real data
   exists. Conflict to resolve: CLAUDE.md calls `schema.sql` the single source
   of truth → proposal in §5, decision D3.
10. **Hardcoded creds** in `docker-compose.yml` are local-only; prod must use
    Vercel env vars (PR-55 gate before repo goes public).
11. **Free-tier behaviours that bite a portfolio project** — now verified
    against official docs on 2026-11-01 (see §8.1 for the full table). The ones
    that shape the design: Supabase free **pauses after 1 week of inactivity**,
    has **no automatic or downloadable backups**, 500 MB DB, 1 GB storage, 5 GB
    egress, 1-day logs. Vercel Hobby is **non-commercial only**, keeps runtime
    logs for **1 hour**, has no log drains and no spend management (exceeding
    limits pauses the feature rather than billing). *Correction to the first
    draft:* Hobby function max duration is **300 s**, not ~10 s, so timeouts
    are not the constraint — cold starts and the 4.5 MB body cap are.
12. **Deleted-account tokens may still work.** `requireAuth` only verifies the
    JWT signature (`authMiddleware.js`); it never checks the user still exists.
    The Business Rules say a token issued before deletion must stop working
    immediately. Needs confirmation and, if confirmed, a fix before any public
    deploy (defect candidate; tracked in §8.2).
13. **Region matters more than anything else for latency.** Vercel functions
    default to `iad1` (US East). Your users are in the Philippines (Davao,
    Php). Pick the nearest Supabase region (Singapore, `ap-southeast-1`) and
    set the Vercel function region to match (`sin1`) so function↔DB hops stay
    short; the browser↔function hop is the only long one.

## 3. Relationship to the remaining Jira work

**Hard gates before anything is public** (must land first)

| Key | Why it gates the migration |
| --- | --- |
| PR-52 Fail-fast config | Vercel env vars are easy to forget; app must refuse to boot without `DATABASE_URL`/`JWT_SECRET` |
| PR-55 Secrets audit (Highest) | Repo/credentials go public-adjacent; gitleaks already in Main pipeline, finish the audit |
| PR-53 helmet + rate limit | Public login endpoint; needs the serverless-safe store (finding 7) |
| PR-56 `/api/v1` prefix | Cheap now, a breaking change once a deployed frontend depends on URLs |
| PR-60 SRS scope update | SRS says "local only"; must change *with* the first deploy issue |
| PR-57 Seed + reset | Needed to populate and restore a paused/wiped Supabase DB |

**Reframe existing Cloud Deployment tickets** (decision already made by you)

| Key | Change |
| --- | --- |
| PR-63 Choose host | Becomes the ADR for *Supabase + Vercel* incl. 12-month billing risk, billing alerts, pause behaviour; no comparison needed beyond a short "why not Render/Fly" |
| PR-64 Managed Postgres | Answered (Supabase). Remaining content: backup/restore test (Supabase free has no PITR — use scheduled `pg_dump` via GitHub Action to artifact/private storage), and migration strategy |
| PR-65 Right-size containers | Mostly obsolete (no containers in cloud). Repurpose to "production-ready build config" or close as won't-do with reason |
| PR-66 Deploy pipeline | Keep: `workflow_dispatch`/tag only. Vercel's Git auto-deploy must be disabled on `main` (ignored-build-step) and deploys run via `vercel deploy --prebuilt` in Actions with GitHub Secrets. Post-deploy health check + tested rollback (`vercel rollback`) |
| PR-58 README | Add deployed URL, architecture diagram, wake-up note |

**Feature epics: build-then-deploy, or deploy-then-build?**
Jira says Cloud Deployment is "late, but before the AI feature". I recommend a
**walking-skeleton deploy early** to the *QA* environment (current features
only, behind the gates above), and **promote to prod after PR-3 (Shop) and
PR-4 (Analytics)** land. Reason: the risky unknowns (uploads, pooler,
cold starts, CORS) are platform risks, and discovering them after the shop and
analytics are built means reworking more code. See decision D1.

- PR-3 Shop: `orders`/`order_items` already in schema. Checkout transaction
  (PR-20) uses row locks — fine on the transaction pooler. Add RLS to any new table.
- PR-4 Analytics: PR-25 (cost fields) must ship as the **first real migration**.
  Analytics gets a **read-only Postgres role** (enforces CLAUDE.md "never add
  writes here" at the database level). PR-30 re-enables compose *locally only*.
- PR-6 Quality: Postman/Playwright get an env switch to target a deployed
  **QA** URL. **Never run suites against prod** (cleanup rule in CLAUDE.md).
  PR-37 k6 contention runs against local/QA only — never Vercel Hobby/Supabase
  free (load testing a shared free tier risks a ban/limits).
- PR-54 structured logging (pino → stdout) lands naturally here; Vercel captures it.
- PR-5 Notifications, PR-11 AI: unaffected; AI deferred as Jira already says.

## 4. Phased implementation plan

Branch convention: `<prefix>/PR-<n>-<purpose>` off `qa`, Conventional Commits,
PR into `qa` then `qa`→`main`. Start from a **clean branch off `qa`** — the
current `test/PR-36-k6-baseline` has uncommitted work.

### Phase 0 — Decisions & docs (no code) · ~0.5 day
- [ ] ADR: Supabase + Vercel, costs, pause behaviour, billing alerts (PR-63)
- [ ] SRS Scope/Constraint update + cloud env notes (PR-60)
- [ ] Decide D1–D4 below
- [ ] Create Supabase `qa` project and Vercel account/projects; enable billing alerts / spend caps

### Phase 1 — Make the app deployable (still local-testable) · `chore/` + `fix/`
1. Config validation module (PR-52) — `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STORAGE_BUCKET`
2. `/api/v1` prefix, update frontend client + Postman + Playwright (PR-56)
3. Storage abstraction: `memoryStorage` + `services/storage.js` (Supabase Storage in cloud; local-disk driver kept for Docker/CI so tests don't need Supabase). Store full URL; update `Avatar.jsx`
4. DB pool config via env (`PG_POOL_MAX`, SSL toggle)
5. CORS allowlist, helmet, metrics gating, structured logging (PR-53/54)
6. Export serverless entry `backend-node/api/index.js` (`module.exports = app`) + `vercel.json`; frontend `vercel.json` SPA rewrite
7. Verify: Docker compose stack + full Postman/Playwright green, unchanged

### Phase 2 — Database on Supabase · `feature/`
1. Introduce `db/migrations/0001_init.sql` (= current schema + RLS enabled on all tables); keep `schema.sql` in sync (D3)
2. Apply to `qa` project via Supabase CLI (`supabase db push`) or `psql`; document in README
3. Seed script (PR-57) targeting `DATABASE_URL`; idempotent, refuses to run against prod without a flag
4. Create the `avatars`/`items` Storage bucket; policy: public read, writes only via service key
5. Scheduled `pg_dump` backup workflow + **documented, tested restore**

### Phase 3 — QA environment live · `ci/`
1. Vercel projects: `pickle-rick-api` (root `backend-node`), `pickle-rick-web` (root `frontend`); env vars for QA
2. Deploy workflow (`workflow_dispatch` + release tag, secrets from GitHub Secrets) (PR-66)
3. Post-deploy health check (`/health`) + smoke Postman run against QA with cleanup
4. Playwright against QA URL (headless in CI, headful locally per project rule)
5. Measure cold start and p95 with a *light* k6 smoke only

### Phase 4 — Production promotion
1. Complete PR-55 audit, PR-58 README with live URL
2. Create `prod` Supabase project; run migrations; seed demo data
3. Production env vars (strong `JWT_SECRET`, restricted CORS, HTTPS-only)
4. Manual deploy from tagged `main`; verify; practice and record a rollback
5. Billing alarm + calendar reminder for free-tier expiry

### Phase 5 — Follow-on, as features land
- Shop (PR-3): migrations + RLS per new table; redeploy QA→prod
- Analytics (PR-4): Vercel project #3, read-only role, `DATABASE_URL` for it, CORS for analytics, `VITE_ANALYTICS_URL`
- Retire/rewrite PR-65

## 5. Decisions needed from you

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | **When to deploy:** early walking-skeleton to QA, prod after Shop + Analytics — or wait until features are done? | **Staged:** private, protected QA now; public prod at the MVP gate. Full analysis: [deploy timing analysis](2026-11-01-deploy-timing-analysis.md) |
| D2 | **Backend hosting:** Express as Vercel serverless function (what you asked) vs. a container host for the API only | Vercel serverless; fall back only if cold starts/limits prove unacceptable in Phase 3 |
| D3 | **Schema source of truth:** numbered migrations + `schema.sql` regenerated, vs. only migrations | Numbered migrations canonical, `schema.sql` kept as a generated snapshot used by Docker initdb; amend CLAUDE.md |
| D4 | **Auth:** keep custom JWT, or move to Supabase Auth | Keep custom (see finding 4) |

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| RLS left off → public data leak | RLS in `0001_init.sql`; Phase 3 check that anon-key REST call to `users` returns nothing |
| Free Supabase project pauses | Seed/restore script, README note, optional keep-alive |
| Cold starts / timeouts on Hobby | Measure in Phase 3; D2 fallback |
| Upload size cap | 4 MB limit, client-side check |
| Tests polluting shared DBs | Suites only target local or QA; never prod |
| Vercel Hobby non-commercial terms | Portfolio use only; note in ADR |
| Billing surprise | Spend caps/alerts before first deploy (PR-10 "cost discipline") |
| Unverified limits in this plan | Every number marked "verify" is checked against official docs in PR-63 |

## 7. Proposed Jira changes (not yet made)
- Edit PR-63, PR-64, PR-65 per §3
- New under PR-10: *Storage abstraction (Supabase Storage)*, *Supabase project + RLS migration*, *Serverless entrypoint + Vercel config*, *Backups: scheduled dump + tested restore*, *Env-targeted test runs (QA URL)*
- Add dependency links: PR-66 ← PR-52, PR-53, PR-55, PR-56, PR-57, PR-60

---

## 8. Production-grade controls available on the free tiers

Goal (your direction): run Pickle Rick the way a real production system is
run, within what Supabase Free and Vercel Hobby actually give us. Limits below
were read from the official docs on **2026-11-01**; re-verify at deploy time,
vendors change plans.

### 8.1 What the free tiers actually give us

| Area | Supabase Free | Vercel Hobby | Design consequence |
| --- | --- | --- | --- |
| Projects | 2 active | 200 projects, 100 deploys/day | QA + prod Supabase; one Vercel project per service |
| Database | 500 MB, shared CPU, 500 MB RAM | n/a | Plenty for demo data; watch uploads going to Storage instead |
| Files | 1 GB storage, 50 MB max upload | Function body cap 4.5 MB | App-level cap 4 MB; compress avatars client-side |
| Egress | 5 GB (+5 GB cached) | 100 GB fast data transfer, 10 GB origin transfer, 1M invocations | Supabase egress is the tight one: long cache TTLs on images |
| Availability | **Pauses after 1 week inactivity** | Function max 300 s, 2 GB RAM | Keep-alive or accepted wake-up (§8.4) |
| Backups | **None** (no PITR, no downloads) | n/a | Self-managed `pg_dump` (§8.4) |
| Logs | 1 day (API + DB) | **1 hour** runtime logs, no drains | External error/log sink needed (§8.5) |
| Connections | Pooler (IPv4) / direct (IPv6 only) | Dynamic IPs, no static IP | Use pooler; **IP allow-listing is not possible** |
| Firewall | Network restrictions (check Free availability) | DDoS mitigation on; **3 WAF custom rules, 10 IP blocks**; Vercel Authentication for deployments | Spend rules wisely (§8.2) |
| Cost ceiling | Free plan hard-limits | **No spend management; overage pauses features, no bill** | With no card on file, bill risk is zero; risk becomes *outage*, not cost |
| Terms | Community support only | **Non-commercial, personal use only** | Fine for a portfolio; the moment real paying courts use it, upgrade |

### 8.2 Security (NFR-03)

**Data layer**
- [ ] RLS enabled on **every** table, no policies (deny by default); re-checked by a CI test that calls the Supabase REST API with the anon key and expects empty/denied for `users`
- [ ] Restrict or disable the Supabase Data API (exposed schemas) — the app talks SQL through our backend, not PostgREST
- [ ] **Least-privilege DB roles**, not the `postgres` superuser: `app_rw` (CRUD on app tables, used by the API), `analytics_ro` (SELECT only, used by the Python service — enforces "never write" in the database), `migrator` (DDL, used only from CI)
- [ ] Database SSL enforcement ON; connection with **`verify-full`** and the Supabase root CA (not `require`, which encrypts but doesn't authenticate the server)
- [ ] Storage buckets: public-read for avatars/item photos only; writes only via service key from the API; validate file type by magic bytes, not just `mimetype`; strip EXIF (location data in phone photos is a privacy leak)
- [ ] `service_role` key exists **only** in the API's Vercel env; never in the frontend bundle, never in git
- [ ] MFA on Supabase, Vercel and GitHub accounts; recovery codes stored offline

**Application layer**
- [ ] Confirm and fix deleted-account token acceptance (finding 12): either look up the user in `requireAuth` or add a `token_version`/`sub` existence check
- [ ] Shorter token life (7 d is long): 15–60 min access token; refresh-token flow is a later epic — decide in an ADR
- [ ] JWT: pin `algorithms: ['HS256']` on verify; reject weak `JWT_SECRET` outside dev (PR-52)
- [ ] Input validation at the controller boundary (e.g. `zod`); audit every raw SQL call for parameterisation (we write raw SQL on purpose, so injection is *our* job)
- [ ] Login brute-force protection and generic auth error messages (avoid account enumeration)
- [ ] Error handler returns no stack traces in production
- [ ] `helmet` on the API; on the frontend, response headers in `vercel.json`: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protections. The JWT lives in browser storage, so a strict CSP is the main XSS mitigation
- [ ] CORS allow-list from env (`CORS_ORIGINS`), no wildcard

**Platform layer (Vercel)**
- [ ] HTTPS-only (automatic); HSTS header
- [ ] **WAF custom rules (3 available):** (1) rate-limit `POST /api/v1/auth/*` if the Hobby rule type allows it — verify; (2) block `/metrics` and other non-public paths; (3) reserve one for incident response. IP blocking (10) for abusers
- [ ] **Deployment Protection / Vercel Authentication** on QA and preview deployments so a half-finished build is not publicly reachable
- [ ] Separate Production vs Preview environment variables; mark secrets as sensitive
- [ ] `express-rate-limit` only with a shared store, otherwise it is decorative (finding 7)

**Supply chain & repo (all free on GitHub)**
- [ ] Dependabot (npm, pip, GitHub Actions) + security updates
- [ ] CodeQL code scanning; secret scanning + push protection; Gitleaks stays in the Main pipeline (PR-55)
- [ ] `npm audit --omit=dev` as a CI gate with a documented exception process
- [ ] Pin third-party GitHub Actions to a commit SHA; set `permissions:` to least privilege per workflow
- [ ] A GitHub **Environment** named `production` with a required reviewer (you) gating the deploy workflow — a human-in-the-loop for prod, free on public repos

**Privacy**
- [ ] Data in play is personal (name, email, photo, location). You operate from the Philippines, so the Data Privacy Act of 2012 (RA 10173) is the relevant frame — add a short Privacy Notice and Terms page, keep data minimal, and note that BR-08 permanent deletion is your "right to erasure" implementation. *(Planning note, not legal advice.)*
- [ ] No real personal data in seeds or fixtures (PR-55)

### 8.3 Hosting & delivery

- [ ] **Environment matrix** documented: Local (Docker) · QA (Supabase qa + Vercel preview/protected) · Prod. Same variable *names* everywhere, different values (12-factor)
- [ ] **Config as code:** `vercel.json` (both projects), `db/migrations/`, `supabase/config.toml` if using the CLI — no clicking-only configuration that can't be reproduced
- [ ] **Release process:** tagged release → manual `workflow_dispatch` deploy to `production` environment → post-deploy `/health` + smoke → GitHub Release notes (feeds "What's new", see initiative doc)
- [ ] **Version traceability:** `/health` returns `{status, version, commit, env}` so you can always answer "what is running?"
- [ ] **Rollback:** Vercel instant rollback for code. Database is **forward-only**: use the *expand → migrate → contract* pattern so the previous app version still works against the new schema
- [ ] Git auto-deploy on `main` disabled; deploy only via the workflow (PR-66)
- [ ] Custom domain is optional and the only likely cost; `*.vercel.app` is fine for now
- [ ] Hobby Git limit: repos must belong to a user account, not a GitHub org — current repo owner `JonThads` is a user, so OK

### 8.4 Reliability & recovery

- [ ] **Pause handling:** a scheduled GitHub Actions job pings an endpoint that runs `SELECT 1` a couple of times a week, *or* explicitly accept pausing for QA and keep a documented "unpause + verify" runbook. Prod: keep-alive on. Note: this works with the intent of the free tier but is a workaround — record it in an ADR
- [ ] **Backups (since Free has none):** nightly GitHub Actions `pg_dump` over the **session pooler (IPv4)** — GitHub runners are IPv4-only, so the IPv6 direct host won't work. Encrypt (`age`), store as a private artifact (90-day max) plus a second copy somewhere not on GitHub or Supabase. Target RPO 24 h
- [ ] **Restore drill:** monthly restore into local Docker, verify row counts and a smoke test. "An untested backup is not a backup" (PR-64)
- [ ] `/health` (process up) vs `/ready` (DB reachable) split; `statement_timeout`, pool connection timeout and a request timeout so a slow DB degrades gracefully instead of hanging
- [ ] Seed/reset script (PR-57) doubles as disaster recovery for demo data

### 8.5 Observability

Vercel keeps logs 1 hour with no drains and Supabase 1 day, so logs would be gone before you could investigate.
- [ ] Structured JSON logs (PR-54) with a **request ID** propagated frontend → API → log lines
- [ ] Free-tier error tracking (e.g. Sentry) on frontend and API; free log sink (e.g. Axiom or Better Stack) — evaluate in a spike, pick one
- [ ] Vercel Web Analytics (50k events) and Speed Insights (10k events) for real-user performance
- [ ] External uptime monitor on `/health` and `/ready` with alerting to email
- [ ] Audit log table for sensitive actions (account deletion, booking approval) — also a good systems-thinking exercise
- [ ] Define two or three **SLOs** (e.g. availability 99% monthly for QA/prod demo, p95 API latency < 800 ms excluding cold start) and review them each release

### 8.6 Performance & efficiency

- [ ] Region alignment (finding 13)
- [ ] Index review against real queries; enable `pg_stat_statements`; `EXPLAIN` the slow ones (Supabase production checklist)
- [ ] Lazy-load heavy modules in the function entry to cut cold start; consider `bcryptjs` vs native `bcrypt` by measuring
- [ ] Long cache headers on hashed frontend assets; `Cache-Control` on Storage objects to protect the 5 GB egress cap
- [ ] Client-side image resize before upload (also solves the 4.5 MB cap)
- [ ] Load test **only against QA and at low scale**, never prod or shared free tiers at scale

### 8.7 Runbooks to write (docs/runbooks/)

`unpause-supabase.md` · `rollback-deploy.md` · `restore-from-backup.md` · `rotate-secrets.md` (rotating `JWT_SECRET` logs everyone out — document it) · `incident-template.md` (blameless, reuse the engineering:incident-response skill).

### 8.8 What we deliberately do **not** do on free tiers

Static-IP allow-listing, point-in-time recovery, read replicas, Vercel log drains, spend caps, password-protected deployments, and multi-region. Each is a Pro-tier feature; record them in the ADR as *known gaps with the upgrade trigger* (e.g. "first real paying court" → Vercel Pro + Supabase Pro).

---

## 9. Related documents

- [Deploy timing analysis](2026-11-01-deploy-timing-analysis.md) — should we deploy as-is or wait for MVP
- [Pickle Rick 2.0 initiative](2026-11-01-pickle-rick-2-0-initiative.md) — agile working agreement, redesign, "What's new", systems-thinking learning track
