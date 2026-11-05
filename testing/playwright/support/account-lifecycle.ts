import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Credentials, TestAccount } from '../config/credentials';

export const API_BASE_URL = 'http://localhost:4000';
type Role = 'player' | 'admin';
type OwnedAccount = TestAccount & { id: string; role: Role; token: string };
export interface RunManifest {
  version: 1;
  runId: string;
  apiBaseURL: string;
  credentials: Credentials;
  accounts: OwnedAccount[];
}

export function assertDisposableTarget() {
  // An email suffix cannot prove which database the API uses. Require the
  // operator to attest that this fixed local stack is disposable.
  if (process.env.PW_ALLOW_DISPOSABLE_DB !== '1') {
    throw new Error('PR-122: set PW_ALLOW_DISPOSABLE_DB=1 only for a disposable test database; real dev/production accounts must not be present');
  }
}

function saveManifest(manifestPath: string, manifest: RunManifest) {
  // Replace atomically: interrupted writes must not produce half a deletion
  // list. Contains disposable passwords/tokens; keep it out of Git.
  const temporary = `${manifestPath}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporary, manifestPath);
}

export function readManifest(manifestPath: string): RunManifest {
  const manifest: RunManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  // Fail closed on malformed or redirected records. This trusted local file
  // is not permission to send credentials to an arbitrary API from JSON.
  if (manifest.version !== 1 || manifest.apiBaseURL !== API_BASE_URL ||
      !/^[0-9a-f-]{36}$/.test(manifest.runId) || !Array.isArray(manifest.accounts) ||
      !manifest.credentials?.players || !manifest.credentials?.admins) {
    throw new Error('PR-122: invalid run ownership manifest');
  }
  for (const account of manifest.accounts) {
    if (!account.id || !account.token || !account.password ||
        !['player', 'admin'].includes(account.role) ||
        !account.email?.endsWith(`-${manifest.runId}@picklerick.test`)) {
      throw new Error('PR-122: invalid account ownership record');
    }
  }
  return manifest;
}

export function createRun(templates: Credentials): string {
  const runId = randomUUID();
  const credentials: Credentials = { players: {}, admins: {} };
  for (const group of ['players', 'admins'] as const) {
    for (const [key, template] of Object.entries(templates[group])) {
      if (!template.fullName || !template.password || !template.email) {
        throw new Error(`PR-122: missing credential template fields for ${group}.${key}`);
      }
      // Original addresses are templates only. Group/key separates accounts
      // inside a run; UUID separates concurrent invocations.
      const alias = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      credentials[group][key] = { ...template, email: `pw-${group}-${alias}-${runId}@picklerick.test` };
    }
  }
  const root = process.env.PW_RUN_ROOT || path.resolve(__dirname, '../.runs');
  fs.mkdirSync(root, { recursive: true });
  const runDirectory = fs.mkdtempSync(path.join(root, 'run-'));
  const manifestPath = path.join(runDirectory, 'ownership.json');
  saveManifest(manifestPath, { version: 1, runId, apiBaseURL: API_BASE_URL, credentials, accounts: [] });
  return manifestPath;
}

export async function registerAccounts(manifestPath: string) {
  assertDisposableTarget();
  const manifest = readManifest(manifestPath);
  for (const group of ['players', 'admins'] as const) {
    for (const [key, account] of Object.entries(manifest.credentials[group])) {
      if (key === 'none') continue; // AUTH-02-001 must remain nonexistent.
      const role: Role = group === 'players' ? 'player' : 'admin';
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...account, role, location: 'Davao' }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status !== 201) {
        // Never log in to, reuse, or delete an account on a collision.
        throw new Error(`PR-122: registration failed (${response.status}): ${body.error || 'unexpected response'}`);
      }
      if (!body.user?.id || !body.token || body.user.email !== account.email || body.user.role !== role) {
        throw new Error('PR-122: registration returned invalid identity; inspect this disposable run for an unrecorded account');
      }
      manifest.accounts.push({ ...account, id: body.user.id, role, token: body.token });
      // Persist immediately, before another registration or any test assertion.
      saveManifest(manifestPath, manifest);
    }
  }
}

export async function cleanupRun(manifestPath: string) {
  assertDisposableTarget();
  if (!fs.existsSync(manifestPath)) return; // Already cleaned; never use templates.
  const manifest = readManifest(manifestPath);
  const failures: Error[] = [];
  const accounts = [...manifest.accounts].sort((a, b) => Number(a.role === 'admin') - Number(b.role === 'admin'));
  for (const account of accounts) {
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${account.token}` };
      // BR-08/FR-12/UC-06: deletion is permanent and cascading. A fresh login
      // by email could target a replacement account; use creation token + ID.
      const identity = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET', headers, signal: AbortSignal.timeout(15_000),
      });
      const body = await identity.json().catch(() => ({}));
      if (!identity.ok || body.user?.id !== account.id || body.user.email !== account.email || body.user.role !== account.role) {
        throw new Error(`identity verification failed (${identity.status})`);
      }
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'DELETE', headers, body: JSON.stringify({ password: account.password }),
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status !== 200) throw new Error(`delete failed (${response.status})`);
      manifest.accounts = manifest.accounts.filter(a => a.id !== account.id);
      saveManifest(manifestPath, manifest);
    } catch (error) {
      failures.push(new Error(`${account.id}: ${error instanceof Error ? error.message : 'cleanup error'}`));
    }
  }
  if (failures.length) {
    throw new AggregateError(failures, `PR-122: cleanup failed; ${manifest.accounts.length} unresolved account(s); ownership retained at ${manifestPath}`);
  }
  fs.unlinkSync(manifestPath);
  // Remove only an empty run directory; never recursively delete a root.
  fs.rmdirSync(path.dirname(manifestPath));
}
