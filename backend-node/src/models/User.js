// =============================================================================
// User model
// =============================================================================
// "Model" here just means: a small module of functions that know how to talk
// to one table. There's no ORM magic - every function below is a plain SQL
// query. This is deliberate for learning: you see exactly what SQL runs.

const pool = require('../config/db');

/**
 * Insert a new user (Player or Admin - see BR-02) and return the created row
 * (minus the password hash, which callers should never need again).
 */

async function createUser({ fullName, email, passwordHash, role, location, photoUrl }) {
    const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, location, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name, email, role, location, photo_url, created_at`,
    [fullName, email, passwordHash, role, location, photoUrl]
    );
    return result.rows[0];
}

/**
 * Look a user up by email - used during login, and to check for duplicate
 * emails during registration. Returns the FULL row (including password_hash)
 * because the login flow needs the hash to compare against.
 */

async function findUserByEmail(email) {
    const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
    );
    return result.rows[0] || null;
}

/**
 * Look a user up by id - used by auth middleware to attach the current
 * user to `req.user` on every authenticated request.
 */

async function findUserById(id) {
    const result = await pool.query(
    `SELECT id, full_name, email, role, location, photo_url, created_at
     FROM users WHERE id = $1`,
    [id]
    );
    return result.rows[0] || null;
}

/**
 * Look a user up by id and INCLUDE the password hash.
 *
 * Deliberately separate from findUserById (which omits the hash) so the hash
 * is only ever loaded where it's genuinely needed - right now that's account
 * deletion, which re-confirms the password before destroying anything.
 * Keeping the default lookup hash-free means a careless `res.json(user)`
 * elsewhere can't leak it.
 */

async function findUserByIdWithPassword(id) {
    const result = await pool.query(
    `SELECT id, full_name, email, password_hash, role, location, photo_url, created_at
     FROM users WHERE id = $1`,
    [id]
    );
    return result.rows[0] || null;
}

/**
 * Partial update of a user's editable profile fields (full name, location,
 * photo). COALESCE keeps whatever's already stored for any field the caller
 * doesn't pass (undefined -> null through pg, which COALESCE skips over) -
 * so "Profile Settings" can save just a name change without wiping the
 * photo, and vice versa.
 */

async function updateUser(id, { fullName, location, photoUrl } = {}) {
    const result = await pool.query(
    `UPDATE users
     SET full_name = COALESCE($1, full_name),
         location  = COALESCE($2, location),
         photo_url = COALESCE($3, photo_url)
     WHERE id = $4
     RETURNING id, full_name, email, role, location, photo_url, created_at`,
    [fullName ?? null, location ?? null, photoUrl ?? null, id]
    );
    return result.rows[0] || null;
}

/**
 * Permanently delete a user and everything that belongs to them.
 * BR-08, FR-12, UC-06 - see "Account Deletion Rules" in the Business Rules
 * doc for the exact cascade this implements.
 *
 * Why this is hand-written instead of a single `DELETE FROM users`:
 *
 * Every foreign key back to `users` is ON DELETE CASCADE, so one statement
 * LOOKS sufficient. It isn't. `order_items.item_id` references `items` with
 * ON DELETE RESTRICT (see db/schema.sql), and Postgres cannot defer a
 * RESTRICT check. So the moment a deleted admin's court has an item that
 * appears on any order line, the cascade hits that RESTRICT and the whole
 * DELETE aborts with a foreign-key violation. Walking the tree child-first
 * avoids ever asking Postgres to cascade into `items`.
 *
 * Everything runs inside one transaction: a half-deleted account (courts
 * gone, user still able to log in) would be far worse than either outcome,
 * so it's all-or-nothing.
 *
 * Scope note - this deletes TWO different things depending on role:
 *   - as a player: their own bookings, join requests, and orders;
 *   - as an admin: their courts, and therefore every OTHER player's bookings
 *     and orders on those courts.
 * That second case is destructive to other people's data, which is why the
 * UI copy in ProfileSettings.jsx warns "This cancels all bookings and cannot
 * be undone" - the controller re-confirms the password before calling this.
 *
 * @param {string} id - the user's UUID
 * @returns {Promise<object|null>} counts of what was removed, or null if no
 *   such user existed
 */

async function deleteUser(id) {
    // A transaction needs one dedicated connection for every statement -
    // pool.query() may hand out a DIFFERENT pooled connection each call, and
    // BEGIN on one connection means nothing to the next. So check one out.
    const client = await pool.connect();

    // Reused in several statements below: the courts this user owns (empty
    // for a player, which makes those clauses harmless no-ops).
    const ownedCourts = `SELECT id FROM courts WHERE admin_id = $1`;

    try {
        await client.query('BEGIN');

        // Delete child tables before their parents, deepest first.
        const orderItems = await client.query(
            `DELETE FROM order_items
              WHERE order_id IN (
                    SELECT id FROM orders
                     WHERE player_id = $1 OR court_id IN (${ownedCourts})
              )`,
            [id]
        );

        const orders = await client.query(
            `DELETE FROM orders
              WHERE player_id = $1 OR court_id IN (${ownedCourts})`,
            [id]
        );

        // Both this user's own "Pasalo" join requests AND anyone else's
        // requests against bookings that are about to disappear.
        const bookingPlayers = await client.query(
            `DELETE FROM booking_players
              WHERE player_id = $1
                 OR booking_id IN (
                        SELECT id FROM bookings
                         WHERE booked_by = $1 OR court_id IN (${ownedCourts})
                    )`,
            [id]
        );

        const bookings = await client.query(
            `DELETE FROM bookings
              WHERE booked_by = $1 OR court_id IN (${ownedCourts})`,
            [id]
        );

        const items = await client.query(
            `DELETE FROM items WHERE court_id IN (${ownedCourts})`,
            [id]
        );

        const courts = await client.query(
            `DELETE FROM courts WHERE admin_id = $1`,
            [id]
        );

        const users = await client.query(
            `DELETE FROM users WHERE id = $1 RETURNING id`,
            [id]
        );

        // No row deleted means the id didn't exist. Roll back rather than
        // commit a transaction that did nothing meaningful.
        if (users.rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        await client.query('COMMIT');

        return {
            orderItems: orderItems.rowCount,
            orders: orders.rowCount,
            joinRequests: bookingPlayers.rowCount,
            bookings: bookings.rowCount,
            items: items.rowCount,
            courts: courts.rowCount,
        };
    } catch (err) {
        // Leave the database exactly as it was, then let the caller's
        // error handler deal with it.
        await client.query('ROLLBACK');
        throw err;
    } finally {
        // ALWAYS hand the connection back, success or failure - a leaked
        // client permanently shrinks the pool (NFR-01).
        client.release();
    }
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    findUserByIdWithPassword,
    updateUser,
    deleteUser,
};