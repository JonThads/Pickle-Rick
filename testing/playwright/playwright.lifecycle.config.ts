import { defineConfig } from '@playwright/test';

// Live API/DB checks for the harness itself; no browser or global hooks.
export default defineConfig({
  testDir: './scripts',
  testMatch: 'account-lifecycle.live.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
});
