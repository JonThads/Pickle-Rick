// tests/auth.spec.ts

import { test, expect } from "../fixtures/base";
import { LoginPage } from "../pages/LoginPage";
import { PlayerDashboardPage } from "../pages/PlayerDashboardPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { credentials } from "../config/credentials"; 
import { LandingPage } from '../pages/LandingPage';

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

test('AUTH-03-001: Player logs out and lands on the Landing Page', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const playerDashboard = new PlayerDashboardPage(page);
    const landingPage = new LandingPage(page);
    const { email, password, fullName } = credentials.players.jordan;

    await loginPage.goto();
    await loginPage.login(email, password);
    await expect(playerDashboard.findCourtHeading).toBeVisible();

    await playerDashboard.navBar.logout(fullName);

    // Expected result: logged out, redirected to the Pickle Rick Landing Page.
    await expect(page).toHaveURL('/');
    await expect(landingPage.heroHeading).toBeVisible;

    // The chip is gone and the logged-out links are back.
    await expect(landingPage.navBar.profileChip(fullName)).toBeHidden();
    await expect(landingPage.navBar.loginLink).toBeVisible();

    // Logout is purely client-side for a stateless JWT -
    // assert the token is actually dropped, not just that the UI reset.
    const token = await page.evaluate(() => localStorage.getItem('pickleRickToken'));
    expect(token).toBeNull();

})

test('AUTH-03-002: Admin logs out and lands on the Landing Page', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const adminDashboard = new AdminDashboardPage(page);
    const landingPage = new LandingPage(page);
    const { email, password, fullName } = credentials.admins.adminXYZ;

    await loginPage.goto();
    await loginPage.login(email, password);
    await expect(adminDashboard.findCourtHeading).toBeVisible();

    await adminDashboard.navBar.logout(fullName);

    await expect(page).toHaveURL('/');
    await expect(landingPage.heroHeading).toBeVisible();
    await expect(landingPage.navBar.profileChip(fullName)).toBeHidden();
    await expect(landingPage.navBar.loginLink).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('pickleRickToken'));
    expect(token).toBeNull();

});