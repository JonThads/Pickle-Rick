// components/NavBar.ts

import { Page, Locator } from "@playwright/test";

/**
 * The auth-aware header (frontend/src/components/NavBar.jsx) renders on every
 * route, outside <Routes> - so it's a component object shared by the page
 * objects rather than being redeclared in each of them.
 *
 * FR-11: logging out is only reachable through the avatar chip's dropdown.
 */

export class NavBar {
    readonly page: Page;
    readonly banner: Locator;
    readonly loginLink: Locator;
    readonly registerLink: Locator;
    readonly logoutButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.banner = page.getByRole('banner');

        // Logged-OUT state: the chip is replaced by these two links.
        this.loginLink = this.banner.getByRole('link', { name: 'Log In' });
        this.registerLink = this.banner.getByRole('link', { name: 'Register' });

        // Lives in the dropdown, which only exists once the chip is clicked -
        // Playwright auto-waits, so no explicit wait is needed here.
        this.logoutButton = this.banner.getByRole('button', { name: 'Log Out' })
    }

    /**
     * The avatar chip. Takes the name because the same chip serves every user;
     * matching is substring-based by default, so this survives the user
     * uploading a photo (which changes the avatar's contribution to the
     * button's accessible name from initials to the alt text).
     */

    profileChip(fullName: string): Locator {
        return this.banner.getByRole('button', { name: fullName });
    }

    /** FR-11 / AUTH-03: open the chip's dropdown, then log out. */
    async logout(fullName: string) {
        await this.profileChip(fullName).click();
        await this.logoutButton.click();
        
    }
}