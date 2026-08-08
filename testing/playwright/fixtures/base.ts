// fixtures/base.ts

import { test as base, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

/**
 * The `test` object every spec imports instead of '@playwright/test'.
 *
 * `finalScreenshot` is an AUTO fixture, so it applies to every test without
 * the spec asking for it. Playwright tears fixtures down in reverse setup
 * order; this one depends on `page`, so its teardown runs BEFORE the page is
 * closed - which is what makes capturing the final on-screen state possible.
 *
 * Files are named after the test-case Ref No (docs/claude-instructions.md
 * requires every test() title to start with one), so the "Screenshot" column
 * in Pickle Rick Test Cases.xlsx can reference them by a stable path.
 */
export const test = base.extend<{ finalScreenshot: void }>({
    finalScreenshot: [
        async ({ page }, use, testInfo) => {
            await use(); // <- the test body runs here

            if (page.isClosed()) return; // nothing left to capture

            // "AUTH-03-001: Player logs out via..." -> "AUTH-03-001"
            const refNo = testInfo.title.split(':')[0].trim();

            // Project name suffix: the config runs chromium/firefox/webkit,
            // so three tests share one Ref No and would overwrite each other.
            const filePath = path.join(
                SCREENSHOT_DIR,
                `${refNo}-${testInfo.project.name}.png`
            );

            // page.screenshot() creates the folder itself - no mkdir needed.
            await page.screenshot({ path: filePath, fullPage: true });

            // Also embed it in the HTML report.
            await testInfo.attach(`${refNo} - final state`, {
                path: filePath,
                contentType: 'image/png',
            });
        },
        { auto: true },
    ],
});

export { expect };