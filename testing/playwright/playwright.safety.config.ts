import { defineConfig } from '@playwright/test';

// PR-122: lifecycle regressions need neither browsers nor a running database.
// Keep them separate so testing the target guard cannot invoke global setup.
export default defineConfig({
  testDir: './scripts',
  testMatch: 'account-lifecycle.test.cjs',
  workers: 1,
  retries: 0,
  reporter: 'list',
});
