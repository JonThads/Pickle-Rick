const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { requireAuth } = require('../src/middleware/authMiddleware');

// PR-92 / PR-43 / NFR-03: isolate the authentication boundary from the
// database and JWT library. Postman covers the full account-deletion flow.
function makeResponse() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test('existing account proceeds using its current database role', async (t) => {
    t.mock.method(jwt, 'verify', () => ({ sub: 'test-user-id', role: 'admin' }));
    t.mock.method(User, 'findUserById', async (id) => {
        assert.equal(id, 'test-user-id');
        return { id, role: 'player' };
    });
    const req = { headers: { authorization: 'Bearer test-token' } };
    const res = makeResponse();
    const calls = [];

    await requireAuth(req, res, (...args) => calls.push(args));

    assert.deepEqual(req.user, { id: 'test-user-id', role: 'player' });
    assert.deepEqual(calls, [[]]);
});

test('deleted account receives 401 and cannot proceed', async (t) => {
    t.mock.method(jwt, 'verify', () => ({ sub: 'deleted-user-id', role: 'player' }));
    t.mock.method(User, 'findUserById', async () => null);
    const req = { headers: { authorization: 'Bearer old-token' } };
    const res = makeResponse();
    const calls = [];

    await requireAuth(req, res, (...args) => calls.push(args));

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'Account no longer exists' });
    assert.equal(req.user, undefined);
    assert.equal(calls.length, 0);
});

for (const errorName of ['JsonWebTokenError', 'TokenExpiredError']) {
    test(`${errorName} receives 401 without querying users`, async (t) => {
        t.mock.method(jwt, 'verify', () => {
            const error = new Error('Rejected token');
            error.name = errorName;
            throw error;
        });
        const lookup = t.mock.method(User, 'findUserById', async () => null);
        const req = { headers: { authorization: 'Bearer bad-token' } };
        const res = makeResponse();
        const calls = [];

        await requireAuth(req, res, (...args) => calls.push(args));

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { error: 'Invalid or expired token' });
        assert.equal(req.user, undefined);
        assert.equal(lookup.mock.callCount(), 0);
        assert.equal(calls.length, 0);
    });
}

for (const header of [undefined, 'Basic test-token']) {
    test(`missing or malformed header (${header}) receives 401`, async (t) => {
        const lookup = t.mock.method(User, 'findUserById', async () => null);
        const req = { headers: { authorization: header } };
        const res = makeResponse();
        const calls = [];

        await requireAuth(req, res, (...args) => calls.push(args));

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { error: 'Missing or malformed Authorization header' });
        assert.equal(lookup.mock.callCount(), 0);
        assert.equal(calls.length, 0);
    });
}

test('database failure reaches the error handler without granting access', async (t) => {
    const databaseError = new Error('Database unavailable');
    t.mock.method(jwt, 'verify', () => ({ sub: 'test-user-id', role: 'player' }));
    t.mock.method(User, 'findUserById', async () => { throw databaseError; });
    const req = { headers: { authorization: 'Bearer test-token' } };
    const res = makeResponse();
    const calls = [];

    await requireAuth(req, res, (...args) => calls.push(args));

    assert.deepEqual(calls, [[databaseError]]);
    assert.equal(req.user, undefined);
    assert.equal(res.body, undefined);
});
