import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import setup from '../global-setup';
import teardown from '../global-teardown';
import { assertDisposableTarget, API_BASE_URL, readManifest, createRun, registerAccounts, cleanupRun } from '../support/account-lifecycle';

const password = 'Disposable-PR122-password';
type Actor = { user: { id: string; email: string; role: string }; token: string };
const call = (route: string, method = 'GET', data?: object, actor?: Actor) => fetch(`${API_BASE_URL}/api${route}`, {
  method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) },
  body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(15_000),
});

test('PR-122: exact email collision preserves the existing account and rolls back earlier setup', async () => {
  assertDisposableTarget();
  const manifestPath = createRun({
    players: { jordan: { email: 'template-player@picklerick.test', password, fullName: 'PR122 player' } },
    admins: { adminXYZ: { email: 'template-admin@picklerick.test', password, fullName: 'PR122 admin' } },
  });
  const manifest = readManifest(manifestPath);
  const admin = manifest.credentials.admins.adminXYZ;
  let sentinel: Actor | undefined;
  try {
    // Deliberately reserve the exact generated email before setup reaches it.
    const response = await call('/auth/register', 'POST', { ...admin, role: 'admin', location: 'Davao' });
    expect(response.status).toBe(201);
    sentinel = await response.json();
    await expect(registerAccounts(manifestPath)).rejects.toThrow(/already exists/);
    const owned = readManifest(manifestPath).accounts;
    expect(owned).toHaveLength(1);
    await cleanupRun(manifestPath);
    expect((await call('/auth/me', 'GET', undefined, sentinel)).status).toBe(200);
    expect((await call('/auth/me', 'GET', undefined, { user: { ...owned[0] }, token: owned[0].token })).status).toBe(401);
  } finally {
    try { await cleanupRun(manifestPath); }
    finally {
      if (sentinel) expect((await call('/auth/me', 'DELETE', { password }, sentinel)).status).toBe(200);
    }
  }
});

test('PR-122: recover explicitly selected ownership manifest', async () => {
  test.skip(!process.env.PW_RECOVER_MANIFEST, 'Recovery requires an explicit manifest path');
  await cleanupRun(process.env.PW_RECOVER_MANIFEST!);
});

test('PR-122: actual failing Playwright test still runs global cleanup', async () => {
  assertDisposableTarget();
  const suiteRoot = path.resolve(__dirname, '..');
  const runRoot = path.join(suiteRoot, '.runs');
  fs.mkdirSync(runRoot, { recursive: true });
  const probe = fs.mkdtempSync(path.join(runRoot, 'failure-probe-'));
  const marker = path.join(probe, 'manifest-path.txt');
  fs.writeFileSync(path.join(probe, 'playwright.config.cjs'), `
    module.exports = {
      testDir: __dirname, testMatch: 'intentional.spec.cjs', workers: 1,
      retries: 0, reporter: 'list',
      globalSetup: require.resolve('../../global-setup.ts'),
      globalTeardown: require.resolve('../../global-teardown.ts')
    };
  `);
  fs.writeFileSync(path.join(probe, 'intentional.spec.cjs'), `
    const { test, expect } = require('@playwright/test');
    const fs = require('node:fs');
    const path = require('node:path');
    test('PR122 deliberate failure after setup', () => {
      fs.writeFileSync(path.join(__dirname, 'manifest-path.txt'), process.env.PW_RUN_MANIFEST);
      expect(false, 'PR122 deliberate assertion failure').toBe(true);
    });
  `);
  try {
    const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config', path.join(probe, 'playwright.config.cjs')], {
      cwd: suiteRoot, encoding: 'utf8', timeout: 20_000,
      env: { ...process.env, PW_CREDENTIALS_FILE: path.join(suiteRoot, 'credentials.example.json') },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('PR122 deliberate assertion failure');
    const ownedManifest = fs.readFileSync(marker, 'utf8');
    expect(fs.existsSync(ownedManifest)).toBe(false);
  } finally {
    if (fs.existsSync(marker)) await cleanupRun(fs.readFileSync(marker, 'utf8'));
    // The generated probe lives in our fresh mkdtemp directory only.
    fs.rmSync(probe, { recursive: true, force: true });
  }
});

test('PR-122: configured existing accounts and their court/booking survive setup and teardown', async () => {
  assertDisposableTarget();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pr122-live-'));
  const originalCredentials = process.env.PW_CREDENTIALS_FILE;
  const originalManifest = process.env.PW_RUN_MANIFEST;
  const actors: Actor[] = [];
  try {
    const suffix = randomUUID();
    const templates = {
      players: { jordan: { fullName: 'PR122 sentinel player', email: `sentinel-player-${suffix}@picklerick.test`, password } },
      admins: { adminXYZ: { fullName: 'PR122 sentinel admin', email: `sentinel-admin-${suffix}@picklerick.test`, password } },
    };
    for (const [role, account] of [['admin', templates.admins.adminXYZ], ['player', templates.players.jordan]] as const) {
      const response = await call('/auth/register', 'POST', { ...account, role, location: 'Davao' });
      expect(response.status).toBe(201);
      actors.push(await response.json());
    }
    const [admin, player] = actors;
    const courtResponse = await call('/courts', 'POST', {
      name: `PR122 sentinel court ${suffix}`, address: 'Disposable test address',
      location: 'Davao', hourlyRatePhp: 300, approvalType: 'auto',
    }, admin);
    expect(courtResponse.status).toBe(201);
    const { court } = await courtResponse.json();
    const bookingResponse = await call('/bookings', 'POST', {
      courtId: court.id, bookingDate: '2030-01-01', startHour: 9,
    }, player);
    expect(bookingResponse.status).toBe(201);
    const beforeCourts = await (await call('/courts/mine', 'GET', undefined, admin)).json();
    const beforeBookings = await (await call('/bookings/mine', 'GET', undefined, player)).json();
    const templateFile = path.join(temporary, 'templates.json');
    fs.writeFileSync(templateFile, JSON.stringify(templates));
    process.env.PW_CREDENTIALS_FILE = templateFile;
    await setup();
    const manifestPath = process.env.PW_RUN_MANIFEST!;
    const created = readManifest(manifestPath).accounts;
    expect(created).toHaveLength(2);
    expect(created.every(a => !actors.some(s => s.user.id === a.id))).toBe(true);
    await teardown();
    expect(fs.existsSync(manifestPath)).toBe(false);
    for (const actor of actors) expect((await call('/auth/me', 'GET', undefined, actor)).status).toBe(200);
    expect(await (await call('/courts/mine', 'GET', undefined, admin)).json()).toEqual(beforeCourts);
    expect(await (await call('/bookings/mine', 'GET', undefined, player)).json()).toEqual(beforeBookings);
    for (const account of created) {
      expect((await call('/auth/me', 'GET', undefined, { user: { ...account }, token: account.token })).status).toBe(401);
    }
  } finally {
    // Clean the run if an assertion failed, then independently clean sentinels.
    try { if (process.env.PW_RUN_MANIFEST !== originalManifest) await teardown(); }
    finally {
      for (const actor of [...actors].reverse()) {
        const response = await call('/auth/me', 'DELETE', { password }, actor);
        expect(response.status).toBe(200);
      }
      if (originalCredentials === undefined) delete process.env.PW_CREDENTIALS_FILE;
      else process.env.PW_CREDENTIALS_FILE = originalCredentials;
      if (originalManifest === undefined) delete process.env.PW_RUN_MANIFEST;
      else process.env.PW_RUN_MANIFEST = originalManifest;
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
});
