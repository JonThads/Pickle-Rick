// global-teardown.ts

import { credentials } from './config/credentials';

const API_BASE_URL = 'http://localhost:4000';

type Account = { email: string; password: string };

/**
 * Deletes every named account global-setup.ts registered, via
 * `DELETE /api/auth/me` (BR-08, password re-confirmed) - so the suite
 * leaves no rows behind (CLAUDE.md § Testing cleanup rule), same intent as
 * testing/postman's `run.js` teardown-in-`finally`
 * (docs/specs/2026-08-08-postman-newman-scaffolding-design.md D6), just
 * simpler here since the delete endpoint didn't exist when that doc was
 * written.
 *
 * Runs after all tests, pass or fail - but ONLY if global-setup itself did
 * not throw, and never on Ctrl+C (Playwright limitation, same as D6's
 * documented one for Postman). Either way, an account left behind is
 * self-healing: the next run's global-setup finds it already registered
 * (idempotent) and the next global-teardown deletes it then.
 */
export default async function globalTeardown() {
  for (const role of ['players', 'admins'] as const) {
    for (const [key, account] of Object.entries(credentials[role])) {
      if (key === 'none') continue;
      await deleteAccount(account);
    }
  }
}

async function deleteAccount(account: Account) {
  const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });

  if (!loginRes.ok) {
    // Nothing to clean up - never got registered, or a previous teardown
    // already deleted it.
    console.warn(`global-teardown: could not log in as ${account.email}, skipping delete`);
    return;
  }

  const { token } = await loginRes.json();

  const deleteRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password: account.password }),
  });

  if (!deleteRes.ok) {
    console.warn(`global-teardown: failed to delete ${account.email} (${deleteRes.status})`);
  }
}
