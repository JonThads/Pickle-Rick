import { test, expect } from '../fixtures/base';
import { APIRequestContext } from '@playwright/test';
import { randomUUID } from 'crypto';
import { LoginPage } from '../pages/LoginPage';

// PR-12/13/15: UI checks against the real Docker API. Each test owns its
// accounts, with password-confirmed teardown even when an assertion fails.
const apiBase = 'http://localhost:4000/api';
const password = 'Disposable-browser-password-42';
type Account = { token: string; email: string; user: { id: string } };
let accounts: Account[];

async function call(request: APIRequestContext, path: string, actor: Account, method = 'GET', data?: object) {
    return request.fetch(`${apiBase}${path}`, { method, data, headers: { Authorization: `Bearer ${actor.token}` } });
}

async function setup(request: APIRequestContext) {
    const created: Account[] = [];
    for (const role of ['admin', 'admin', 'player', 'player']) {
        const email = `defect-ui-${randomUUID()}@example.com`;
        const response = await request.post(`${apiBase}/auth/register`, {
            data: { fullName: `Browser ${role} ${created.length}`, email, password, role, location: 'Davao' },
        });
        expect(response.status()).toBe(201);
        const account = { ...await response.json(), email };
        accounts.push(account);
        created.push(account);
    }
    const [admin, outsider, player, competitor] = created;
    const courtResponse = await call(request, '/courts', admin, 'POST', {
        name: `Browser regression ${randomUUID()}`, location: 'Davao', address: 'Disposable test court',
        hourlyRatePhp: 300, approvalType: 'manual',
    });
    expect(courtResponse.status()).toBe(201);
    const { court } = await courtResponse.json();
    // Match the app's local-calendar date, not UTC's potentially different day.
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const book = async (actor: Account) => {
        const response = await call(request, '/bookings', actor, 'POST', { courtId: court.id, bookingDate: date, startHour: 9 });
        expect(response.status()).toBe(201);
        return (await response.json()).booking;
    };
    return { admin, outsider, player, competitor, court, date, book };
}

test.beforeEach(() => { accounts = []; });
test.afterEach(async ({ request }) => {
    // Sequential deletes avoid running several overlapping admin cascades.
    const failures: number[] = [];
    for (const account of accounts.reverse()) {
        const response = await call(request, '/auth/me', account, 'DELETE', { password });
        if (response.status() !== 200) failures.push(response.status());
    }
    expect(failures, 'every disposable account must be removed').toEqual([]);
});

test('BUG-12-001: another admin sees an ownership error for a foreign court', async ({ page, request }) => {
    const data = await setup(request);
    await data.book(data.player);
    const login = new LoginPage(page);
    await login.goto();
    await login.login(data.outsider.email, password);
    await expect(page.getByRole('heading', { name: 'Your courts' })).toBeVisible();
    await page.goto(`/admin/courts/${data.court.id}`);
    await expect(page.locator('.error-banner')).toHaveText('You do not manage this court');
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
});

test('BUG-13-001: stale player availability cannot request an approved slot', async ({ page, request }) => {
    const data = await setup(request);
    const login = new LoginPage(page);
    await login.goto();
    await login.login(data.competitor.email, password);
    const card = page.locator('.motif-card').filter({ has: page.getByRole('heading', { name: data.court.name, exact: true }) });
    await card.getByRole('button', { name: 'Book', exact: true }).click();
    const slot = page.locator('.slot-grid').getByRole('button', { name: /^9AM\s+Book$/ });
    await expect(slot).toBeVisible();
    // A real second player/admin changes server state after this browser
    // rendered availability. No route interception or fake API responses.
    const booking = await data.book(data.player);
    expect((await call(request, `/bookings/${booking.id}/approve`, data.admin, 'PATCH')).status()).toBe(200);
    const response = page.waitForResponse(r => r.url() === `${apiBase}/bookings` && r.request().method() === 'POST');
    await slot.click();
    expect((await response).status()).toBe(409);
    await expect(page.locator('.error-banner')).toHaveText('This slot is already approved');
    const mine = await call(request, '/bookings/mine', data.competitor);
    expect((await mine.json()).bookings).toEqual([]);
});

test('BUG-15-001: owner approval cancels the competing request', async ({ page, request }) => {
    const data = await setup(request);
    const first = await data.book(data.player);
    const second = await data.book(data.competitor);
    const login = new LoginPage(page);
    await login.goto();
    await login.login(data.admin.email, password);
    await expect(page.getByRole('heading', { name: 'Your courts' })).toBeVisible();
    await page.goto(`/admin/courts/${data.court.id}`);
    await page.getByRole('button', { name: /9AM.*2 pending request/ }).click();
    const response = page.waitForResponse(r => r.url().endsWith(`/bookings/${first.id}/approve`));
    // Scope to the intended player's row; equal-hour rows have no guaranteed
    // database tie order, so first() could approve the wrong request.
    await page.locator('.player-row').filter({ hasText: 'Browser player 2' })
        .getByRole('button', { name: 'Approve', exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByRole('button', { name: /9AM.*Booked/ })).toBeVisible();
    const all = await call(request, `/bookings/court/${data.court.id}?date=${data.date}`, data.admin);
    const bookings = (await all.json()).bookings;
    expect(bookings.find((b: { id: string }) => b.id === first.id).status).toBe('approved');
    expect(bookings.find((b: { id: string }) => b.id === second.id).status).toBe('cancelled');
});
