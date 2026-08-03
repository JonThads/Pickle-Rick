// =============================================================================
// Database connection (Node.js side)
// =============================================================================
// We use the `pg` package's connection Pool instead of a single Client.
// A Pool keeps several open connections ready to go, and hands one out
// whenever a query needs it - this matters once multiple requests hit the
// API at the same time (see NFR-01: "handle multiple requests simultaneously").

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Fail loudly and early if the DB connection breaks, instead of silently
// hanging requests. Easier to debug during local development.
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;
