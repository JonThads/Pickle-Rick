// global-setup.ts

import { credentials } from './config/credentials';

// Matches the port the CI workflow health-checks before running any suite
// (.github/workflows/_reusable-full-suite.yml, "Wait for backend-node to be
// healthy").
const API_BASE_URL = 'http://localhost:4000';

type Account = { email: string; password: string; fullName: string };

/**
 * Registers every named account in credentials.json before the suite runs -
 * mirroring testing/postman's self-registering test-account convention
 * (docs/specs/2026-08-08-postman-newman-scaffolding-design.md D3) - so a
 * fresh `docker compose up` database (CI) ends up with the same accounts a
 * long-lived local dev database previously only had because a developer
 * registered them by hand.
 *
 * "none" is always skipped: its entire purpose (AUTH-02-001) is to be an
 * account that does NOT exist, so it must never be registered here.
 */
export default async function globalSetup() {
  for (const role of ['players', 'admins'] as const) {
    for (const [key, account] of Object.entries(credentials[role])) {
      if (key === 'none') continue;
      await registerIfMissing(account, role === 'players' ? 'player' : 'admin');
    }
  }
}

async function registerIfMissing(account: Account, role: 'player' | 'admin') {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: account.fullName,
      email: account.email,
      password: account.password,
      role,
    }),
  });

  if (res.ok) return;

  // "An account with that email already exists" - re-running locally
  // against a long-lived dev database (or re-running after a Ctrl+C that
  // skipped global-teardown) is expected to hit this every time. Any other
  // 400 (a real validation problem) still fails the run.
  const body = await res.json().catch(() => ({}));
  if (res.status === 400 && typeof body.error === 'string' && body.error.includes('already exists')) {
    return;
  }

  throw new Error(`global-setup: failed to register ${account.email} (${res.status} ${JSON.stringify(body)})`);
}
