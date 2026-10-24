// pages/AdminDashboardPage.ts

import { Page, Locator } from "@playwright/test";
import { NavBar } from "../components/NavBar";

export class AdminDashboardPage {
    readonly page: Page;
    readonly header: Locator;
    readonly dashboardLabel: Locator;
    readonly findCourtHeading: Locator;
    readonly navBar: NavBar;
    readonly errorBanner: Locator;

    // "Add a court" form
    readonly courtNameInput: Locator;
    readonly courtAddressInput: Locator;
    readonly courtLocationInput: Locator;
    readonly courtHourlyRateInput: Locator;
    readonly courtApprovalTypeSelect: Locator;
    readonly addCourtButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.getByRole('banner');
        this.dashboardLabel = page.getByText('ADMIN DASHBOARD', { exact: true });
        this.findCourtHeading = page.getByRole('heading', { name: 'Your courts' });
        this.navBar = new NavBar(page);
        this.errorBanner = page.locator('.error-banner');

        this.courtNameInput = page.getByLabel('Name');
        this.courtAddressInput = page.getByLabel('Address');
        this.courtLocationInput = page.getByLabel('Location');
        this.courtHourlyRateInput = page.getByLabel('Hourly rate');
        this.courtApprovalTypeSelect = page.getByLabel('Approval type');
        this.addCourtButton = page.getByRole('button', { name: 'Add court' });
    }

    // UC-03 / COURT-01: fill the "Add a court" form and submit.
    async addCourt(court: {
        name: string;
        address: string;
        location: string;
        hourlyRatePhp: number;
        approvalType: 'manual' | 'auto';
    }) {
        await this.courtNameInput.fill(court.name);
        await this.courtAddressInput.fill(court.address);
        await this.courtLocationInput.fill(court.location);
        await this.courtHourlyRateInput.fill(String(court.hourlyRatePhp));
        await this.courtApprovalTypeSelect.selectOption(court.approvalType);
        await this.addCourtButton.click();
    }

    // The "Your courts" card whose <h3> is this court's name.
    courtCard(name: string): Locator {
        return this.page
            .locator('.motif-card')
            .filter({ has: this.page.getByRole('heading', { level: 3, name }) });
    }
}