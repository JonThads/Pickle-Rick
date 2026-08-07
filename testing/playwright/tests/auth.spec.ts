// tests/auth.spec.ts

import { test, expect } from '@playwright/test';
import { LoginPage } from "../pages/LoginPage";
import { PlayerDashboardPage } from "../pages/PlayerDashboardPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { credentials } from "../config/credentials"; 

test('AUTH-01-001: Player Login redirects to the Player Dashboard', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const playerDashboard = new PlayerDashboardPage(page);

    await loginPage.goto();
    await loginPage.login(credentials.players.jordan.email, credentials.players.jordan.password);

    await expect(playerDashboard.header).toContainText(credentials.players.jordan.fullName);
    await expect(playerDashboard.findCourtHeading).toBeVisible();

});

test('AUTH-01-002: Admin Login redirects to Admin Dashboard', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);

    await loginPage.goto();
    await loginPage.login(credentials.admins.adminXYZ.email, credentials.admins.adminXYZ.password);

    await expect(adminDashboard.header).toContainText(credentials.admins.adminXYZ.fullName);
    await expect(adminDashboard.findCourtHeading).toBeVisible();

});

test('AUTH-02-001: No existing credentials', async ({ page }) => {

    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(credentials.players.none.email, credentials.players.none.password);

    await expect(loginPage.errorPrompt).toBeVisible();

})