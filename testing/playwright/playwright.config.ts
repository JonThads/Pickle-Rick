import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Registers/tears down the named accounts in credentials.json against the
     backend API before/after the whole run - see global-setup.ts and
     global-teardown.ts for why. */
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* One worker, always.
     The default (half the logical CPUs) launches several browsers at once,
     and because this suite runs HEADED (see `headless: false` below) that
     means several real browser windows competing with the Docker stack for
     CPU and RAM. On a constrained machine the Vite dev server and the
     browser content processes starve: page loads stretch past 10s and
     dispatched clicks never get processed, so tests fail on the 30s timeout
     with no defect behind it. Serial is also the only way the run is
     actually watchable, which is the point of running headed here. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Run headful by default — practicing/observing automation is the point of this
       project's Playwright suite, not just a pass/fail result (see docs/claude-instructions.md).
       GitHub Actions runners have no display though, so CI forces headless the same way
       `forbidOnly`/`retries` above already branch on process.env.CI - see PR-46. */
    headless: !!process.env.CI,

    /* Screenshots */
    screenshot: { mode: 'on', fullPage: true },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
