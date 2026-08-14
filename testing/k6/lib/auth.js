// =============================================================================
// k6 auth helpers
// =============================================================================
// Shared by every script: create disposable test accounts, log in, and clean
// them up again. Reused so each script isn't reinventing register/login and
// so cleanup (CLAUDE.md's "clean up test data after every run" rule) is
// implemented once instead of copy-pasted.

import http from 'k6/http';
import { check } from 'k6';
import { API } from './config.js';

const TEST_PASSWORD = 'K6-test-pw-1!';

// __VU/__ITER/Date.now() keeps emails unique across VUs, iterations, and
// repeated runs, so parallel test accounts never collide on the unique
// email constraint.

function uniqueEmail(prefix) {
    return `${prefix}-${__VU}-${__ITER}-${Date.now()}@k6.test`;
}

function register(role, location) {
    const email = uniqueEmail(role);
    const res = http.post(
        `${API}/auth/register`,
        JSON.stringify({
            fullName: `K6 ${role} VU${__VU}`,
            email,
            password: TEST_PASSWORD,
            role,
            location,
        }),

        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'register' } }
    );

    check(res, { 'register: 201': (r) => r.status === 201 });

    const body = res.json();
    return { email, password: TEST_PASSWORD, token: body.token, user: body.user };
}

export function registerPlayer(location) {
    return register('player', location);
}

export function registerAdmin(location) {
    return register('admin', location);
}

export function login(email, password) {
    const res = http.post(
        `${API}/auth/login`,
        JSON.stringify({ email, password }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
    );

    check(res, { 'login: 200': (r) => r.status === 200 });
    return res.json('token');
}

export function authHeaders(token) {
    return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
}

// Deletes a test account created by registerPlayer/registerAdmin above.
// Deleting an admin cascades to every court it manages (and those courts'
// bookings/items), per the Account Deletion Rules doc, so callers don't need
// to separately tear down courts they created through an admin account.

export function deleteAccount(account) {
    const res = http.del(
        `${API}/auth/me`,
        JSON.stringify({ password: account.password }),
        Object.assign(authHeaders(account.token), { tags: { name: 'deleteAccount' } })
        );

        check(res, { 'cleanup: account deleted': (r) => r.status === 200 });
        return res;
}