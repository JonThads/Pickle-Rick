// tests/court-management.spec.ts

import { test, expect } from "../fixtures/base";
import { LoginPage } from "../pages/LoginPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { credentials } from "../config/credentials";

test('COURT-01-001: Admin adds an Auto-Approval court and it appears under "Your courts"', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const admin = credentials.admins.adminXYZ;

    // Unique per run: business-rules.md forbids the same admin reusing a court
    // name, so a re-run would fail if a prior court outlived teardown. The
    // court itself is cleaned up when global-teardown deletes this admin
    // (cascades to their courts).
    const courtName = `PW Auto Court ${Date.now()}`;

    await loginPage.goto();
    await loginPage.login(admin.email, admin.password);
    await expect(adminDashboard.findCourtHeading).toBeVisible();

    await adminDashboard.addCourt({
        name: courtName,
        address: 'Lorem Ipsum Address',
        location: 'Davao',
        hourlyRatePhp: 300,
        approvalType: 'auto',
    });

    // COURT-01-001 expected results 1 & 2: listed under "Your courts" with
    // exactly the details entered.
    const card = adminDashboard.courtCard(courtName);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Lorem Ipsum Address');
    await expect(card).toContainText('₱300.00/hr');
    await expect(card).toContainText('auto approval');
    await expect(card).toContainText('Davao');
    await expect(adminDashboard.errorBanner).toBeHidden();
});

test('COURT-01-002: Admin adds a Manual Approval court and it appears under "Your courts"', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const admin = credentials.admins.adminXYZ;

    // Unique per run: business-rules.md forbids the same admin reusing a court
    // name, so a re-run would fail if a prior court outlived teardown. The
    // court itself is cleaned up when global-teardown deletes this admin
    // (cascades to their courts).
    const courtName = `PW Manual Court ${Date.now()}`;

    await loginPage.goto();
    await loginPage.login(admin.email, admin.password);
    await expect(adminDashboard.findCourtHeading).toBeVisible();

    await adminDashboard.addCourt({
        name: courtName,
        address: 'Lorem Ipsum Address',
        location: 'Davao',
        hourlyRatePhp: 300,
        approvalType: 'manual',
    });

    // COURT-01-002 expected results 1 & 2: listed under "Your courts" with
    // exactly the details entered.
    const card = adminDashboard.courtCard(courtName);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Lorem Ipsum Address');
    await expect(card).toContainText('₱300.00/hr');
    await expect(card).toContainText('manual approval');
    await expect(card).toContainText('Davao');
    await expect(adminDashboard.errorBanner).toBeHidden();
});

test('COURT-02-001: Admin cannot add a second court with the same name', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const admin = credentials.admins.adminXYZ;

    const courtName = `PW Dup Court ${Date.now()}`;
    const court = {
        name: courtName,
        address: 'Lorem Ipsum Address',
        location: 'Davao',
        hourlyRatePhp: 300,
        approvalType: 'manual' as const,
    };

    await loginPage.goto();
    await loginPage.login(admin.email, admin.password);
    await expect(adminDashboard.findCourtHeading).toBeVisible();

    // First court with this name — succeeds.
    await adminDashboard.addCourt(court);
    await expect(adminDashboard.courtCard(courtName)).toHaveCount(1);

    // Same name again — business-rules.md § Admin Rules:
    // "the same Admin cannot register two courts under the same name".
    await adminDashboard.addCourt({ ...court });

    // COURT-02-001 expected result: an error prompt naming the duplicate,
    // and the duplicate is NOT added.
    await expect(adminDashboard.errorBanner).toBeVisible();
    await expect(adminDashboard.errorBanner).toContainText(/already (exists|have)/i);
    await expect(adminDashboard.courtCard(courtName)).toHaveCount(1);
});