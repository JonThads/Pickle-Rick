// pages/PlayerDashboardPage.ts

import { Page, Locator } from "@playwright/test";
import { NavBar } from "../components/NavBar";

export class PlayerDashboardPage {
    readonly page: Page;
    readonly header: Locator;
    readonly dashboardLabel: Locator;
    readonly findCourtHeading: Locator;
    readonly navBar: NavBar;

    constructor(page: Page) {
        this.page = page;
        this.header = page.getByRole('banner');
        this.dashboardLabel = page.getByText('PLAYER DASHBOARD', { exact: true });
        this.findCourtHeading = page.getByRole('heading', { name: 'Find a court' });
        this.navBar = new NavBar(page);
    }
}