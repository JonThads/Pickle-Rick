// =============================================================================
// k6 shared config
// =============================================================================
// One place to point every script at the right stack. Override with:
//   k6 run -e BASE_URL=http://localhost:4000 testing/k6/load-test.js
// Defaults to the port docker-compose.yml maps backend-node to.

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
export const API = `${BASE_URL}/api`;