// pages/PlayerDashboardPage.ts

import { Page, Locator } from "@playwright/test";

export class PlayerDashboardPage {
    readonly page: Page;
    readonly header: Locator;
    readonly dashboardLabel: Locator;
    readonly findCourtHeading: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.getByRole('banner');
        this.dashboardLabel = page.getByText('PLAYER DASHBOARD', { exact: true });
        this.findCourtHeading = page.getByRole('heading', { name: 'Find a court' });
    }
}