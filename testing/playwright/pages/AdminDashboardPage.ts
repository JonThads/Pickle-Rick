// pages/AdminDashboardPage.ts

import { Page, Locator } from "@playwright/test";

export class AdminDashboardPage {
    readonly page: Page;
    readonly header: Locator;
    readonly dashboardLabel: Locator;
    readonly findCourtHeading: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.getByRole('banner');
        this.dashboardLabel = page.getByText('ADMIN DASHBOARD', { exact: true });
        this.findCourtHeading = page.getByRole('heading', { name: 'Your courts' });
    }
}