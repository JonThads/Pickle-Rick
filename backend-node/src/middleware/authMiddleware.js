// =============================================================================
// Auth middleware
// =============================================================================
// Express middleware runs BEFORE your route handler. `requireAuth` checks the
// `Authorization: Bearer <token>` header on every protected route, decodes
// it, and attaches the result to `req.user` so every controller downstream
// can trust `req.user.id` / `req.user.role` without re-checking anything.

const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res. status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = header.slice('Bearer '.length);

    try {
        const decoded = verifyToken(token);
        req.user = { id: decoded.sub, role: decoded.role };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
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