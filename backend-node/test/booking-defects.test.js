// PR-12/13/15/16: real HTTP/PostgreSQL regressions, run inside the backend
// container against a disposable Compose database. No mocked SQL results.
const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../src/config/db');
const controller = require('../src/controllers/bookingController');

const base = process.env.TEST_API_URL || 'http://localhost:4000';
const password = 'Disposable-test-password-42';
const bookingDate = '2026-11-15';
let accounts;
let admin, outsider, player, competitor, court;

async function api(path, actor, method = 'GET', body) {
    const response = await fetch(`${base}/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}

beforeEach(async () => {
    accounts = [];
    for (const role of ['admin', 'admin', 'player', 'player']) {
        const result = await api('/auth/register', null, 'POST', {
            fullName: 'Disposable regression account', email: `defect-${randomUUID()}@example.com`,
            password, role, location: 'Davao',
        });
        assert.equal(result.status, 201);
        accounts.push(result.body);
    }
    [admin, outsider, player, competitor] = accounts;
    const result = await api('/courts', admin, 'POST', {
        name: `Regression ${randomUUID()}`, address: 'Test only', location: 'Davao',
        hourlyRatePhp: 300, approvalType: 'manual',
    });
    assert.equal(result.status, 201);
    court = result.body.court;
});

afterEach(async () => {
    // Deleting these uniquely named test accounts cascades their courts,
    // bookings and orders. Never delete unrelated development data.
    const results = await Promise.all(accounts.map(account => api('/auth/me', account, 'DELETE', { password })));
    for (const result of results) assert.equal(result.status, 200, 'test account cleanup');
});
after(async () => { await pool.end(); });

async function book(actor = player, startHour = 9, selectedCourt = court) {
    return api('/bookings', actor, 'POST', { courtId: selectedCourt.id, bookingDate, startHour });
}

async function states() {
    const result = await api(`/bookings/court/${court.id}?date=${bookingDate}`, admin);
    assert.equal(result.status, 200);
    return result.body.bookings.map(b => b.status).sort();
}

for (const action of ['list', 'approve', 'cancel']) {
    test(`PR-12: another admin cannot ${action} a court's bookings`, async () => {
        const created = await book();
        assert.equal(created.status, 201);
        const path = action === 'list' ? `/bookings/court/${court.id}?date=${bookingDate}` : `/bookings/${created.body.booking.id}/${action}`;
        const result = await api(path, outsider, action === 'list' ? 'GET' : 'PATCH');
        assert.equal(result.status, 403);
        assert.deepEqual(await states(), ['pending']);
        assert.equal((await api(path, admin, action === 'list' ? 'GET' : 'PATCH')).status, 200);
    });
}

test('PR-12: only the booking player or owning court admin can cancel; missing resources return 404', async () => {
    const created = await book();
    const path = `/bookings/${created.body.booking.id}/cancel`;
    assert.equal((await api(path, competitor, 'PATCH')).status, 403);
    assert.equal((await api(path, player, 'PATCH')).status, 200);
    assert.equal((await api(`/bookings/court/${randomUUID()}?date=${bookingDate}`, admin)).status, 404);
    assert.equal((await api(`/bookings/${randomUUID()}/approve`, admin, 'PATCH')).status, 404);
});

test('PR-13: manual approved slot rejects a different player with 409', async () => {
    const created = await book();
    assert.equal((await api(`/bookings/${created.body.booking.id}/approve`, admin, 'PATCH')).status, 200);
    const result = await book(competitor);
    assert.equal(result.status, 409);
    assert.match(result.body.error, /approved|taken|unavailable/i);
    assert.deepEqual(await states(), ['approved']);
});

test('PR-13: unapproved manual slot still allows competing pending requests', async () => {
    assert.equal((await book()).status, 201);
    assert.equal((await book(competitor)).status, 201);
    assert.deepEqual(await states(), ['pending', 'pending']);
});

test('PR-13: auto court rejects second booking; equivalent string hour cannot duplicate own request', async () => {
    await pool.query("UPDATE courts SET approval_type = 'auto' WHERE id = $1", [court.id]);
    assert.equal((await book()).status, 201);
    assert.equal((await book(competitor)).status, 409);
    // PostgreSQL stores integer hours; representation must not bypass guards.
    assert.equal((await book(player, '9')).status, 409);
});

test('PR-13: simultaneous own requests leave exactly one pending booking', async () => {
    const responses = await Promise.all([book(), book()]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    assert.deepEqual(await states(), ['pending']);
});

test('PR-13/15: approval racing a new request leaves no pending row behind', async () => {
    const created = await book();
    const [approved, requested] = await Promise.all([
        api(`/bookings/${created.body.booking.id}/approve`, admin, 'PATCH'), book(competitor),
    ]);
    assert.equal(approved.status, 200);
    assert.ok([201, 409].includes(requested.status));
    const final = await states();
    assert.equal(final.filter(s => s === 'approved').length, 1);
    assert.ok(!final.includes('pending'));
});

test('PR-15: approval cancels competitors; concurrent approvals cannot both win', async () => {
    const first = await book();
    const second = await book(competitor);
    const results = await Promise.all([first, second].map(r => api(`/bookings/${r.body.booking.id}/approve`, admin, 'PATCH')));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.deepEqual(await states(), ['approved', 'cancelled']);
});

test('PR-15: SQL failure between approval and competitor cancellation rolls back both', async () => {
    const first = await book();
    await book(competitor);
    const originalQuery = pool.query;
    const originalConnect = pool.connect;
    // Inject a real SQL error only at competitor cancellation. Exercise the
    // existing controller as well as its model so the pre-fix two-query path
    // fails this same regression by leaving the approval committed.
    const isCancellation = sql => /UPDATE bookings[\s\S]*AND id !=/.test(sql);
    pool.query = function (sql, ...args) {
        return isCancellation(sql) ? originalQuery.call(this, 'SELECT 1 / 0') : originalQuery.call(this, sql, ...args);
    };
    pool.connect = function (callback) {
        // pg's pool.query uses callback-style acquisition internally.
        if (callback) return originalConnect.call(this, callback);
        return acquireClient.call(this);
    };
    async function acquireClient() {
        const client = await originalConnect.call(this);
        const query = client.query;
        const release = client.release;
        client.query = function (sql, ...args) {
            return isCancellation(sql) ? query.call(this, 'SELECT 1 / 0') : query.call(this, sql, ...args);
        };
        client.release = function (...args) {
            client.query = query;
            client.release = release;
            return release.apply(this, args);
        };
        return client;
    }
    let failure;
    try {
        await controller.approveBooking(
            { params: { id: first.body.booking.id }, user: admin.user },
            { json() { assert.fail('approval must not return success after SQL failure'); }, status() { return this; } },
            error => { failure = error; }
        );
    } finally {
        pool.query = originalQuery;
        pool.connect = originalConnect;
    }
    assert.equal(failure?.code, '22012');
    assert.deepEqual(await states(), ['pending', 'pending']);
});

test('PR-16: omitted order status defaults to placed; invalid lifecycle value is rejected', async () => {
    const result = await pool.query('INSERT INTO orders (court_id, player_id) VALUES ($1, $2) RETURNING status', [court.id, player.user.id]);
    assert.equal(result.rows[0].status, 'placed');
    await assert.rejects(pool.query("INSERT INTO orders (court_id, player_id, status) VALUES ($1, $2, 'pending')", [court.id, player.user.id]), { code: '23514' });
});
