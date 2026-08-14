// pages/LandingPage.ts

import { Page, Locator } from "@playwright/test";
import { NavBar } from "../components/NavBar";

export class LandingPage {
    readonly page: Page;
    readonly navBar: NavBar;
    readonly heroHeading: Locator;

    constructor(page: Page) {
        this.page = page;
        this.navBar = new NavBar(page);
        this.heroHeading = page.getByRole('heading', { name: 'One jar' });
    }

    async goto() {
        await this.page.goto('/');
    }
}