// =============================================================================
// Auth controller
// =============================================================================
// Covers BR-01, BR-02, FR-01, FR-11, UC-01, UC-02

const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

/**
 * PATCH /api/auth/me
 * Profile Settings: edit full name / location. Photo upload is a separate
 * endpoint (below) since it needs multipart/form-data, not JSON.
 */

async function updateMe(req, res, next) {
    try {
        const { fullName, location } = req.body;
        const user = await User.updateUser(req.user.id, { fullName, location });
        res.json({ user });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/auth/me/photo
 * Optional profile picture upload (multipart, field name "photo"). The
 * actual multer middleware lives in routes/authRoutes.js; by the time this
 * runs, `req.file` has already been written to disk.
 */

async function uploadPhoto(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No photo file uploaded (expected field name "photo")' });
        }

        // Served statically from app.js at /uploads - see there.
        const photoUrl = `/uploads/${req.file.filename}`;
        const user = await User.updateUser(req.user.id, { photoUrl });
        res.json({ user });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/auth/register
 * BR-02: registration must support both "player" and "admin" roles.
 */

async function register(req,res, next) {
    try {
        const { fullName, email, password, role, location, photoUrl } = req.body;

    // Basic input validation
    if (!fullName || !email || !password || !role) {
        return res.status(400).json({ error: 'fullName, email, password, and role are required' });
    }
    if (!['admin', 'player'].includes(role)) {
        return res.status(400).json({ error: 'role must be "admin" or "player"' });
    }

    const existing = await User.findUserByEmail(email);
    if (existing) {
        return res.status(400).json({ error: 'An account with that email already exists' });
    }

    // BCrypt Hashing
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.createUser({ fullName, email, passwordHash, role, location, photoUrl });
    const token = signToken(user);

    // UC-01 / UC-02: "User is directed to the Player/Admin Dashboard" - in a
    // REST API, that "direction" is the frontend's job once it has a token.

    res.status(201).json({ user, token });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/auth/login
 * FR-01: users log in based on their assigned role.
 */

async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res. status(400).json({ error: 'email and password are required' });
        }

        const user = await User.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if(!passwordMatches) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = signToken(user);
        // Remove Password Hash from API Response
        delete user.password_hash;
        res.status(200).json({ user, token });

    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/auth/me
 * Handy "who am I" endpoint the frontend can call on page load to check
 * whether a stored token is still valid, and to fetch the current user's
 * profile (role, name, etc.) without re-sending credentials.
 */

async function me(req, res, next) {
    try {
        const user = await User.findUserById(req.user.id);

        // A signed token outlives the account it points at: JWTs are stateless,
        // so deleting a user (DELETE /me) can't revoke tokens already issued to
        // them. Without this guard the endpoint answers 200 {"user": null},
        // which reads as "logged in" to the frontend and leaves a ghost session
        // that can't be clicked out of. 401 is what AuthContext already treats
        // as "log out", so a deleted account resolves itself on next page load.
        if (!user) {
            return res.status(401).json({ error: 'Account no longer exists' });
        }

        res.json({ user });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/auth/me
 * BRD "Business Processes": Login, Registration, and Account Deletion.
 *
 * Deletes the CURRENTLY AUTHENTICATED user - the id comes from the verified
 * JWT, never from the request body, so nobody can delete someone else's
 * account by guessing an id.
 *
 * Requires the account password in the body, even though the caller already
 * proved they hold a valid token. A token can be replayed from a shared
 * machine, a leaked log, or an unlocked laptop; a password re-prompt means
 * possession of the token alone isn't enough to destroy an account. This is
 * standard practice for irreversible account actions and is cheap to add
 * here (NFR-03).
 */

async function deleteMe(req, res, next) {
    try {
        const { password } = req.body || {};

        if (!password) {
            return res.status(400).json({ error: 'password is required to delete your account' });
        }

        // Needs the hash, so use the password-bearing lookup rather than the
        // default findUserById.
        const user = await User.findUserByIdWithPassword(req.user.id);

        if (!user) {
            // Valid token, but the row is gone - e.g. the account was already
            // deleted in another tab/session. Same 401 as GET /me for the same
            // reason: the token is no longer usable, and the client should log
            // out rather than retry.
            return res.status(401).json({ error: 'Account no longer exists' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        const deleted = await User.deleteUser(req.user.id);

        if (!deleted) {
            // Lost a race - the account was deleted between the password check
            // above and the delete itself.
            return res.status(401).json({ error: 'Account no longer exists' });
        }

        // Report what actually went away. For an admin this can include other
        // players' bookings on their courts, so it's worth being explicit
        // rather than returning a bare 204.
        res.status(200).json({
            message: 'Account deleted',
            deleted,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { register, login, me, updateMe, uploadPhoto, deleteMe };