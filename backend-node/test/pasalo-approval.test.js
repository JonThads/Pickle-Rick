// PR-123 / FR-08 / NFR-01: real HTTP and PostgreSQL regressions.
// Run inside the backend container with the local API running.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../src/config/db');
const controller = require('../src/controllers/bookingController');
const base = process.env.TEST_API_URL || 'http://localhost:4000';
const accounts = [];
const password = 'Disposable-pasalo-password-42';
let admin, owner, joiners, court;
let hour = 0;

async function api(path, actor, method = 'GET', body) {
    const response = await fetch(`${base}/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}

before(async () => {
    for (const role of ['admin', ...Array(9).fill('player')]) {
        const result = await api('/auth/register', null, 'POST', {
            fullName: 'PR-123 disposable account', email: `pasalo-${randomUUID()}@example.com`,
            password, role, location: 'Davao',
        });
        assert.equal(result.status, 201);
        accounts.push(result.body);
    }
    [admin, owner, ...joiners] = accounts;
    const result = await api('/courts', admin, 'POST', {
        name: `PR-123 ${randomUUID()}`, address: 'Test only', location: 'Davao',
        hourlyRatePhp: 300, approvalType: 'auto',
    });
    assert.equal(result.status, 201);
    court = result.body.court;
});

after(async () => {
    // All fixtures belong to these exact accounts; never reset user volumes.
    // Attempt every deletion even if one fails, then close the test pool.
    try {
        const results = await Promise.allSettled(accounts.map(actor => api('/auth/me', actor, 'DELETE', { password })));
        for (const result of results) {
            assert.equal(result.status, 'fulfilled', 'cleanup request completed');
            assert.equal(result.value.status, 200, 'disposable account deleted');
        }
        const remaining = await pool.query('SELECT id FROM users WHERE id = ANY($1::uuid[])', [accounts.map(a => a.user.id)]);
        assert.equal(remaining.rowCount, 0, 'all test accounts removed');
    } finally { await pool.end(); }
});

async function fixture() {
    const created = await api('/bookings', owner, 'POST', {
        courtId: court.id, bookingDate: '2026-11-15', startHour: hour++,
    });
    assert.equal(created.status, 201);
    const booking = created.body.booking;
    const requests = [];
    // Create pending requests before filling capacity, matching real usage.
    for (const actor of joiners) {
        const result = await api(`/bookings/${booking.id}/join`, actor, 'POST');
        assert.equal(result.status, 201);
        requests.push(result.body.joinRequest);
    }
    return { booking, requests };
}

const decide = (request, approve = true, actor = owner) =>
    api(`/bookings/join-requests/${request.id}`, actor, 'PATCH', { approve });
const stored = async id => (await pool.query('SELECT * FROM booking_players WHERE booking_id = $1 ORDER BY id', [id])).rows;

test('PR-123: concurrent approvals compete for the last seat, including the owner', async () => {
    const { booking, requests } = await fixture();
    for (const request of requests.slice(0, 6)) assert.equal((await decide(request)).status, 200);
    const blocker = await pool.connect();
    let competing;
    let waiting = 0;
    try {
        await blocker.query('BEGIN');
        await blocker.query('SELECT id FROM bookings WHERE id = $1 FOR UPDATE', [booking.id]);
        competing = Promise.all(requests.slice(6).map(request => decide(request)));
        // Hold the parent lock until BOTH HTTP handlers are waiting in SQL.
        // This proves overlap instead of trusting OS/network scheduling.
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
            const result = await pool.query(
                `SELECT COUNT(*)::int AS count FROM pg_stat_activity
                 WHERE datname = current_database() AND wait_event_type = 'Lock'
                   AND query LIKE '%JOIN booking_players bp ON bp.booking_id = b.id%'`
            );
            waiting = result.rows[0].count;
            if (waiting >= 2) break;
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    } finally {
        await blocker.query('ROLLBACK');
        blocker.release();
    }
    const results = await competing;
    assert.ok(waiting >= 2, 'both approvals overlapped while waiting for the booking lock');
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const rows = await stored(booking.id);
    assert.equal(rows.filter(r => r.status === 'approved').length + 1, 8);
    const losing = requests.slice(6).find(request => rows.find(r => r.id === request.id).status === 'pending');
    // Full capacity blocks approval only, not a pending rejection.
    assert.equal((await decide(losing, false)).status, 200);
});

test('PR-123: concurrent approve/disapprove processes a request exactly once', async () => {
    const { booking, requests } = await fixture();
    const results = await Promise.all([decide(requests[0]), decide(requests[0], false)]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const winner = results.find(r => r.status === 200).body.joinRequest.status;
    assert.equal((await stored(booking.id)).find(r => r.id === requests[0].id).status, winner);
});

test('PR-123: terminal decisions cannot be replayed or reversed; authorization is retained', async () => {
    const { booking, requests } = await fixture();
    assert.equal((await decide(requests[0], true, joiners[0])).status, 403);
    assert.equal((await decide({ id: randomUUID() })).status, 404);
    for (const [index, initial] of [true, false].entries()) {
        assert.equal((await decide(requests[index], initial)).status, 200);
        for (const approve of [true, false]) assert.equal((await decide(requests[index], approve)).status, 409);
        assert.equal((await stored(booking.id)).find(r => r.id === requests[index].id).status, initial ? 'approved' : 'disapproved');
    }
});

test('PR-123: failure after the update rolls back the decision and releases the lock', async () => {
    const { booking, requests } = await fixture();
    const originalConnect = pool.connect;
    // Execute the UPDATE against PostgreSQL, then force a genuine SQL failure
    // before commit. This checks rollback of an actual write, not mocked rows.
    pool.connect = function (callback) {
        if (callback) return originalConnect.call(this, callback);
        return acquireClient.call(this);
    };
    async function acquireClient() {
        const client = await originalConnect.call(this);
        const query = client.query;
        const release = client.release;
        client.query = async function (sql, ...args) {
            const result = await query.call(this, sql, ...args);
            if (/UPDATE booking_players/.test(sql)) await query.call(this, 'SELECT 1 / 0');
            return result;
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
        await controller.respondToJoinRequest(
            { params: { joinRequestId: requests[0].id }, body: { approve: true }, user: owner.user },
            { status() { assert.fail('must not send a response before commit'); } },
            error => { failure = error; }
        );
    } finally { pool.connect = originalConnect; }
    assert.equal(failure?.code, '22012');
    assert.equal((await stored(booking.id)).find(r => r.id === requests[0].id).status, 'pending');
    assert.equal((await decide(requests[0])).status, 200, 'a later request can acquire the released lock');
});
