// =============================================================================
// Auth middleware
// =============================================================================
// Express middleware runs BEFORE your route handler. `requireAuth` checks the
// `Authorization: Bearer <token>` header on every protected route, verifies
// that the account still exists, and attaches its identity to `req.user` so controllers
// can trust `req.user.id` / `req.user.role` without re-checking anything.

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

async function requireAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = header.slice('Bearer '.length);
    let decoded;

    // Invalid or expired JWTs are authentication failures.
    try {
        decoded = verifyToken(token);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        // PR-92 / BR-08, FR-12, UC-06, NFR-03:
        // A valid JWT can outlive its account. Check the database on every
        // protected request so account deletion immediately blocks reuse.
        const user = await User.findUserById(decoded.sub);

        if (!user) {
            return res.status(401).json({ error: 'Account no longer exists' });
        }

        // Use the verified subject's database identity and current stored
        // role, never a client-supplied identity or a stale token role.
        req.user = { id: user.id, role: user.role };
    } catch (err) {
        // Database failures are server errors, not invalid credentials.
        // Forward them without allowing the protected handler to run.
        return next(err);
    }

    return next();
}

/**
 * Usage: router.post('/courts', requireAuth, requireRole('admin'), handler)
 * Call this AFTER requireAuth, since it depends on req.user being set.
 */

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Requires Role: ${allowedRoles.join(" or ")}' });
        }
        next();
    }
}

module.exports = { requireAuth, requireRole };
