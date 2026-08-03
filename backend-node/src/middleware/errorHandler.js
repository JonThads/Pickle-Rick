// =============================================================================
// Centralized error handler
// =============================================================================
// Express recognizes this as an error handler because it takes FOUR
// arguments (err, req, res, next). Mounting it last in app.js means any
// `next(err)` call, or any thrown error inside an `async` route wrapped in
// try/catch, ends up here instead of crashing the whole server.

// Postgres error code for "unique constraint violated" - used to turn a raw
// DB error into a friendly message (e.g. double-booking a slot, or
// registering with an email that's already taken).

const PG_UNIQUE_VIOLATION = '23505';

function errorHandler(err, req, res, next) {
    console.log(err);

    if (err.code === PG_UNIQUE_VIOLATION) {
        return res.status(409).json({ error: 'That record already exists (duplicate entry)' });
    }

    const status = err.status || 500;
    const message = status === 500 ? 'Oops! Something went wrong on our end.' : err.message;
    res.status(status).json({ error: message });
}

module.exports = errorHandler;