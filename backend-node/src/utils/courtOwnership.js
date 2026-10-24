const Court = require('../models/Court');

/**
 * BR-05 / NFR-03 / PR-12: a role check alone does not authorize an admin
 * to manage someone else's court. Both inventory and booking controllers
 * use this check with the verified JWT identity. Booking actions pass the
 * court ID loaded from the booking, never an ID supplied in the body.
 * Returns null after sending the error so callers stop before querying data.
 */
async function loadOwnedCourtOr403(req, res, courtId = req.params.courtId) {
    const court = await Court.findCourtById(courtId);
    if (!court) {
        res.status(404).json({ error: 'Court not found' });
        return null;
    }
    if (court.admin_id !== req.user.id) {
        res.status(403).json({ error: 'You do not manage this court' });
        return null;
    }
    return court;
}

module.exports = { loadOwnedCourtOr403 };
