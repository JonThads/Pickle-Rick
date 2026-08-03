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

module.exports = { createUser, findUserByEmail, findUserById, updateUser };