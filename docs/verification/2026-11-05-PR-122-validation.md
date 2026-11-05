# PR-122 review and parallel validation

Pre-integration snapshot: 2026-11-05. Branch:
`fix/PR-122-playwright-account-ownership`, based on `qa` at `691ab7c`.
The user subsequently confirmed validation and authorized the `qa`/`main`
merges on 2026-11-05. GitHub PR/check records own the live integration status;
the results and branch-cleanup record below describe the pre-integration run.

## Review focus

1. `global-setup.ts` checks explicit disposable-database opt-in before requests,
   creates a run manifest, and cleans partial setup before propagating errors.
2. `support/account-lifecycle.ts` records successful creations, rejects existing
   accounts, verifies creation-token identity, and retains cleanup failures.
3. `config/credentials.ts` supplies generated aliases lazily to workers; original
   template addresses are not used for login or deletion.
4. `global-teardown.ts` has no credential-list deletion fallback.
5. The local runner preserves private credentials; CI opts in only for its
   freshly provisioned disposable stack.

No application API/schema change. PR-42's shared per-test fixtures are deferred.

## Step-by-step validation

1. In PowerShell, confirm the branch and inspect the diff:

   ```powershell
   Set-Location C:/Projects/pickle-rick
   git branch --show-current
   git diff --stat
   git diff -- testing/playwright .github/workflows/_reusable-full-suite.yml
   ```

2. Verify the disposable project, database mount and ports:

   ```powershell
   docker compose -p pickle-rick-pr122 ps
   docker inspect pickle-rick-pr122-postgres-1 --format '{{json .Mounts}}'
   ```

   Expected: PR-122 services serve localhost:4000/5173; Postgres mounts
   `pickle-rick-pr122_pgdata`. If stopped, start in another terminal:
   `docker compose -p pickle-rick-pr122 up --build postgres backend-node frontend`.
   Do not start the default development project on the same ports.

3. Run checks that do not touch the database:

   ```powershell
   Set-Location C:/Projects/pickle-rick/testing/playwright
   npm run typecheck
   npm run test:safety
   ```

   Expected: typecheck exits 0; all nine safety checks pass. They cover collision,
   missing opt-in, owned-only deletion/order, partial setup, cleanup failures,
   missing manifest, identity mismatch, redirected manifest and overlapping runs.

4. Confirm the default refusal through the real entry point:

   ```powershell
   Remove-Item Env:PW_ALLOW_DISPOSABLE_DB -ErrorAction SilentlyContinue
   npx playwright test tests/auth.spec.ts --project=chromium --reporter=list
   ```

   Expected: nonzero exit and an error mentioning `PW_ALLOW_DISPOSABLE_DB`;
   no account registration or browser test starts. The failure is intentional.

5. Enable the disposable target and run live preservation tests:

   ```powershell
   $env:PW_ALLOW_DISPOSABLE_DB = '1'
   $env:PW_CREDENTIALS_FILE = "$PWD/credentials.example.json"
   npm run test:lifecycle
   ```

   Expected: three passing tests and one skipped recovery-only test. One
   creates sentinel accounts, a court and a booking, lists those exact account
   emails in a temporary credential template, runs setup/teardown, and verifies
   the original accounts/court/booking are unchanged. Another creates an
   account at the exact generated email before registration reaches it; setup
   rejects the collision, and cleanup removes only its earlier creation. Each
   preservation check removes its own sentinels in `finally`. A third check
   launches a child Playwright run with a deliberate assertion failure and
   confirms that global teardown removes its ownership manifest.

6. Run all three browsers twice against the same database:

   ```powershell
   ./scripts/run-court-tests-local.ps1 -All -DisposableDatabase
   # Run the SQL check below, then repeat without resetting the database:
   ./scripts/run-court-tests-local.ps1 -All -DisposableDatabase
   ```

   Expected per run: 33 passes, no retries/failures, visible browser windows.
   Check the exit code after each command: `$LASTEXITCODE` must be 0.

7. After each completed run, verify cleanup from the repository root:

   ```powershell
   Set-Location C:/Projects/pickle-rick
   docker compose -p pickle-rick-pr122 exec -T postgres psql -U pickle_rick -d pickle_rick -c "SELECT 'users' AS entity,count(*) FROM users UNION ALL SELECT 'courts',count(*) FROM courts UNION ALL SELECT 'items',count(*) FROM items UNION ALL SELECT 'bookings',count(*) FROM bookings UNION ALL SELECT 'booking_players',count(*) FROM booking_players UNION ALL SELECT 'orders',count(*) FROM orders UNION ALL SELECT 'order_items',count(*) FROM order_items;"
   Get-ChildItem testing/playwright/.runs -Recurse -Filter ownership.json
   ```

   On the initially empty isolated project, expect all seven table counts 0
   and no remaining ownership manifests. Counts can be nonzero while another
   run is active; check after both sessions finish. Compare with baseline when
   intentionally retaining sentinel data. Never delete by prefix to force a pass.

8. Report your code-review findings and test results before promotion. Record
   commands, exit codes, failing test names and cleanup counts. The agent must
   wait for your testing before pushing or opening integration/promotional PRs.
   This gate was satisfied by the user's subsequent validation confirmation.

For parallel testing, each invocation has unique emails and manifests. Use a
separate checkout for simultaneous browser runs to keep screenshot/HTML report
files separate, or run your browser checks after the agent's runs. Safety checks
and code review can run alongside the agent's browser tests in this checkout.
Avoid manually modifying or deleting another active run's accounts.

## Cleanup and recovery

The suites clean their data automatically. For interrupted runs, use the explicit
manifest recovery command in the [Playwright guide](../../testing/playwright/README.md).
Stop only the isolated services when finished:
`docker compose -p pickle-rick-pr122 stop` (preserves volumes until promotion).
After successful merge to `main` and passing checks, verify the task ownership
labels and remove only this project with
`docker compose -p pickle-rick-pr122 down -v`. Confirm
`pickle-rick-pr122_pgdata` is gone. This cleanup is authorized by the user's
2026-11-05 workflow update. Clear temporary
`PW_ALLOW_DISPOSABLE_DB` and `PW_CREDENTIALS_FILE` environment variables afterward.

## Agent verification record

These checks validate this branch snapshot; user review/testing and GitHub CI
remain separate gates.

| Check | Observed result |
| --- | --- |
| Original-behavior regressions | Seven initial safety checks failed against the old setup/teardown, including collision adoption and credential-list cleanup |
| `npm run test:safety` | 9 passed, exit 0 |
| `npm run test:lifecycle` | 3 passed, 1 recovery-only skip, exit 0; includes an expected failing child test whose global teardown completed |
| Missing opt-in through the main Playwright CLI | Expected exit 1 with `PW_ALLOW_DISPOSABLE_DB` error, before registration |
| `npm run typecheck` | Exit 0 |
| First full headed suite | 33 passed, exit 0, 2.4 minutes |
| Second full headed suite, same DB with no reset | 33 passed, exit 0, 2.2 minutes |
| SQL cleanup after each full run | All seven data tables at 0 rows after associated live checks completed |
| Retained ownership manifests at handoff | None |
| PowerShell runner syntax and `git diff --check` | Passed |

The full runs covered Chromium, Firefox and WebKit on Windows, one worker,
headed, with no retries. The isolated project `pickle-rick-pr122` uses
`pickle-rick-pr122_pgdata` and is left running for the user's validation.
The default development volume was not reset or removed. The Node console
emitted an environment color warning (`NO_COLOR`/`FORCE_COLOR`); no test failed.

Self-review covered target opt-in, ownership registration, missing/corrupt
manifests, identity checks, partial setup rollback, cleanup errors, worker
credentials, local runner restoration and CI opt-in. No blocking finding was
identified in that review. The user subsequently confirmed validation and
authorized promotion; see the pre-integration snapshot note above.
Hard kills, lost registration responses and failed disk persistence remain
explicit recovery limitations; expired tokens require manual ID-based
investigation, never automatic email adoption.

## Branch cleanup record

Fetched/pruned `origin` and checked GitHub PR history before cleanup. All eight
old task branches had zero unique patches versus refreshed `origin/qa`.
The court-management branch's relevant files were identical to `qa`; its
closed PR #12 was not treated as proof of merging by itself. Other branches
were linked to merged PRs (#4, #6, #11, #24, #28, #30) or integrated through
PR #28. Deleted the eight local and remote task branches, with atomic remote
deletion protected by exact-commit leases:

- `chore/PR-120-localhost-ports-and-planning-docs`
- `chore/prometheus-grafana`
- `docs/PR-134-documentation-structure`
- `docs/PR-17-booking-constraint-comments`
- `docs/PR-62-codex-instructions`
- `docs/ci-cd-pipeline-sync`
- `fix/PR-123-atomic-pasalo-approval`
- `test/court-management-playwright`

Verified local `qa`/`main` had no unique commits and fast-forwarded each to its
remote. Their file contents match, but history differs: `main` contains the
promotion commit `b0c77a9` that is not an ancestor of `qa` at `691ab7c`. Re-audit
and reconcile promotion history through the normal PR flow before merging.
Only local `qa`, `main` and the new PR-122 branch remain; only `qa`/`main`
remain as remote branches. At this pre-integration checkpoint, PR-122 code
had not been pushed or merged.
