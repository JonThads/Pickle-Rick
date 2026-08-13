// =============================================================================
// k6 smoke test
// =============================================================================
// Not a performance test - a fast sanity check that the stack is up and the
// core read/write path works before running anything heavier. 1 VU, 1
// iteration. Run this first after `docker compose up`.
//
//   k6 run testing/k6/smoke-test.js
//   k6 run -e BASE_URL=http://localhost:4000 testing/k6/smoke-test.js

import { check, sleep } from 'k6';
import http, { get } from 'k6/http';
import { API } from './lib/config.js';
import { registerPlayer, authHeaders, deleteAccount } from './lib/auth.js';

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: {
        http_req_failed: ['rate==0'], // Failed Requests failes the entire Smoke Test
    },
};

export default function () {
    // 1. Register - PostgreSQL DB Write + Password Hashing + JWT Generation
    const player = registerPlayer('Davao');

    // 2. GET /me - Token Authentication
    const me = http.get(`${API}/auth/me`, authHeaders(player.token));
    check(me, { 'GET /auth/me: 200': (r) => r.status === 200 });

    // 3. GET /courts?location=
    const courts = http.get(`${API}/courts?location=Davao`, authHeaders(player.token));
    check(courts, { 'GET /courts: 200': (r) => r.status === 200 });

    // 4. GET /bookings/mine
    const bookings = http.get(`${API}/bookings/mine`, authHeaders(player.token));
    check(bookings, { 'GET /bookings/mine: 200': (r) => r.status === 200 });

    // 5. Clean Up as per CLAUDE.md Rule
    deleteAccount(player);

    sleep(1);
}