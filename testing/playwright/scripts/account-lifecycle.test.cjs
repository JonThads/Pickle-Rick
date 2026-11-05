// PR-122: exercise the real setup/teardown with HTTP replaced at the boundary.
// No real credentials, accounts, browser, or database are touched by these tests.
const { test } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const templates = {
  players: {
    jordan: { email: 'pw-jordan@picklerick.test', password: 'test-password', fullName: 'PW Jordan' },
    none: { email: 'pw-none@picklerick.test', password: 'test-password', fullName: 'PW None' },
  },
  admins: { adminXYZ: { email: 'pw-admin@picklerick.test', password: 'test-password', fullName: 'PW Admin' } },
};
// Replace only the private-file input; keep setup, persistence and teardown real.
const credentialsPath = require.resolve('../config/credentials.ts');
const credentialsModule = new Module(credentialsPath);
credentialsModule.filename = credentialsPath;
credentialsModule.loaded = true;
credentialsModule.exports = { credentials: templates, loadCredentialTemplates: () => structuredClone(templates) };
require.cache[credentialsPath] = credentialsModule;
const setup = require('../global-setup.ts').default;
const teardown = require('../global-teardown.ts').default;
let directory, requests, registered, originalFetch, originalEnv;

test.beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pr122-'));
  requests = [];
  registered = [];
  originalFetch = global.fetch;
  originalEnv = { ...process.env };
  process.env.PW_ALLOW_DISPOSABLE_DB = '1';
  process.env.PW_RUN_ROOT = directory;
  delete process.env.PW_RUN_MANIFEST;
  global.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    requests.push({ url, method: options.method, body, headers: options.headers });
    if (url.endsWith('/register')) {
      const id = `user-${registered.length}`;
      registered.push({ ...body, id });
      return Response.json({ user: { id, email: body.email, role: body.role }, token: `token-${id}` }, { status: 201 });
    }
    if (url.endsWith('/me') && options.method === 'GET') {
      const id = options.headers.Authorization.replace('Bearer token-', '');
      const account = registered.find(a => a.id === id);
      return Response.json({ user: { id, email: account.email, role: account.role } });
    }
    if (options.method === 'DELETE') return Response.json({ message: 'Account deleted' });
    if (url.endsWith('/login')) return Response.json({ token: 'token-user-0' });
    throw new Error(`Unexpected HTTP request: ${url}`);
  };
});

test.afterEach(() => {
  global.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('existing account collision aborts setup and never logs in or deletes that account', async () => {
  global.fetch = async (url, options) => {
    requests.push({ url, method: options.method });
    return Response.json({ error: 'An account with that email already exists' }, { status: 400 });
  };
  let setupError;
  try { await setup(); } catch (error) { setupError = error; }
  await teardown();
  assert.match(setupError?.message ?? '', /already exists/);
  assert.equal(requests.filter(r => r.url.endsWith('/login') || r.method === 'DELETE').length, 0);
});

test('missing explicit database opt-in refuses all requests', async () => {
  delete process.env.PW_ALLOW_DISPOSABLE_DB;
  await assert.rejects(setup(), /PW_ALLOW_DISPOSABLE_DB/);
  assert.equal(requests.length, 0);
});

test('successful run deletes only recorded accounts, players before admins', async () => {
  await setup();
  const manifestPath = process.env.PW_RUN_MANIFEST;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.accounts.length, 2);
  assert.equal(registered.length, 2, 'the nonexistent login account is never registered');
  assert.ok(registered.every(a => a.email.endsWith('@picklerick.test')));
  assert.ok(registered.every(a => ![templates.players.jordan.email, templates.admins.adminXYZ.email].includes(a.email)));
  await teardown();
  assert.deepEqual(requests.filter(r => r.method === 'DELETE').map(r => r.headers.Authorization), ['Bearer token-user-0', 'Bearer token-user-1']);
  assert.equal(fs.existsSync(manifestPath), false);
});

test('partial setup failure cleans up earlier creations without adopting the collision', async () => {
  const successfulFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (url.endsWith('/register') && registered.length === 1) return Response.json({ error: 'An account with that email already exists' }, { status: 400 });
    return successfulFetch(url, options);
  };
  await assert.rejects(setup(), /already exists/);
  assert.equal(requests.filter(r => r.method === 'DELETE').length, 1);
  await teardown();
  assert.equal(requests.filter(r => r.method === 'DELETE').length, 1, 'cleanup is idempotent');
});

test('failed deletion attempts remaining accounts, fails visibly, and retains only unresolved ownership', async () => {
  await setup();
  const successfulFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (options.method === 'DELETE' && options.headers.Authorization === 'Bearer token-user-0') {
      requests.push({ url, ...options });
      return Response.json({ error: 'Temporary database failure' }, { status: 503 });
    }
    return successfulFetch(url, options);
  };
  await assert.rejects(teardown(), /cleanup failed/i);
  assert.equal(requests.filter(r => r.method === 'DELETE').length, 2);
  const remaining = JSON.parse(fs.readFileSync(process.env.PW_RUN_MANIFEST, 'utf8'));
  assert.deepEqual(remaining.accounts.map(a => a.id), ['user-0']);
  global.fetch = successfulFetch;
  await teardown();
  assert.equal(fs.existsSync(process.env.PW_RUN_MANIFEST), false);
});

test('missing manifest never falls back to deleting configured credentials', async () => {
  await teardown();
  assert.equal(requests.length, 0);
});

test('identity mismatch refuses deletion and preserves ownership for investigation', async () => {
  await setup();
  const successfulFetch = global.fetch;
  global.fetch = async (url, options) => url.endsWith('/me') && options.method === 'GET'
    ? Response.json({ user: { id: 'different-user', email: 'unrelated@example.com', role: 'player' } })
    : successfulFetch(url, options);
  await assert.rejects(teardown(), /cleanup failed/i);
  assert.equal(requests.filter(r => r.method === 'DELETE').length, 0);
});

test('corrupt or redirected manifest refuses all cleanup requests', async () => {
  await setup();
  const manifestPath = process.env.PW_RUN_MANIFEST;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.apiBaseURL = 'https://unrelated.example.com';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  requests.length = 0;
  await assert.rejects(teardown(), /invalid run ownership manifest/);
  assert.equal(requests.length, 0);
});

test('overlapping invocations have separate identities and cleanup lists', async () => {
  await setup();
  const firstPath = process.env.PW_RUN_MANIFEST;
  const first = JSON.parse(fs.readFileSync(firstPath, 'utf8'));
  await setup();
  const secondPath = process.env.PW_RUN_MANIFEST;
  const second = JSON.parse(fs.readFileSync(secondPath, 'utf8'));
  assert.notEqual(firstPath, secondPath);
  assert.ok(second.accounts.every(a => !first.accounts.some(b => a.email === b.email)));
  await teardown();
  assert.equal(fs.existsSync(firstPath), true);
  assert.equal(fs.existsSync(secondPath), false);
  process.env.PW_RUN_MANIFEST = firstPath;
  await teardown();
  assert.equal(fs.existsSync(firstPath), false);
});
