// =============================================================================
// Court controller
// =============================================================================
// Covers BR-04, BR-05, FR-02, UC-03.

const Court = require('../models/Court');
const Booking = require('../models/Booking');

/**
 * POST /api/courts  (admin only - see courtRoutes.js)
 */

async function createCourt(req, res, next) {
    try {
        const { name, address, location, hourlyRatePhp, approvalType } = req.body;

        if (!name || !address || !location || hourlyRatePhp == null) {
            return res.status(400).json({ error: 'name, address, location, and hourlyRatePhp are required' });
        }
        if (approvalType && !['auto', 'manual'].includes(approvalType)) {
            return res.status(400).json({ error: 'approvalType must be either "auto" or "manual"' });
        }

        const court = await Court.createCourt({
            adminId: req.user.id, // taken from the verified JWT, never from the request body
            name, 
            address, 
            location, 
            hourlyRatePhp, 
            approvalType: approvalType || 'manual', // BR-04: configurable per court, manual by default
        });
        res.status(201).json({ court });

    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/courts/mine  (admin only)
 * BR-05: "a list of all courts managed by a specific admin"
 */

async function listMyCourts(req, res, next) {
    try {
        const courts = await Court.findCourtsByAdmin(req.user.id);
        res.json({ courts });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/courts?location=Davao  (any logged-in player)
 * Business Rules doc: players only see courts in their own location.
 */

async function listCourtsByLocation(req, res, next) {
    try {
        const { location } = req.query;
        if (!location) {
            return res.status(400).json({ error: 'location query parameter is required' });
        }

        const courts = await Court.findCourtsByLocation(location);
        res.json({ courts });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/courts/:courtId/availability?date=YYYY-MM-DD  (any logged-in role)
 * Powers the Player dashboard's calendar + hourly-slot booking flow.
 * Reshapes the raw booking rows into a per-hour status array. Rival PENDING
 * requesters stay anonymous (a Player only needs to know a slot is still
 * requestable), but a CONFIRMED booking's owner + Pasalo roster is included
 * for approved/mine-approved slots - that's public once it's booked, and
 * it's what lets the slot picker show "who's playing" / the X/8 count
 * without a second round trip per slot.
 */

async function getAvailability(req, res, next) {
    try {
        const { courtId } = req.params;
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'date query param (YYYY-MM-DD) is required' });
        }

        const court = await Court.findCourtById(courtId);
        if (!court) {
            return res.status(404).json({ error: 'Court not found' });
        }

        const bookings = await Booking.findBookingsForCourtOnDate(courtId, date);

        // A confirmed booking's own name/roster isn't sensitive the way a
        // rival PENDING requester's identity is, so it's fine to attach here
        // for both "this slot is joinable via Pasalo" (approved) and "you're
        // already booked, see who else is in" (mine-approved) - it's what
        // powers the X/8 roster in the slot picker without extra round trips.
        async function withRoster(booking) {
            const players = await Booking.findApprovedPlayersForBooking(booking.id);
            return { ownerName: booking.owner_name, ownerPhotoUrl: booking.owner_photo_url, players };
        }

        const detailed = await Booking.findBookingsForCourtOnDateDetailed(courtId, date);

        const slots = [];
        for (let startHour = 0; startHour < 24; startHour++) {
            const approved = detailed.find((b) => b.start_hour === startHour && b.status === 'approved');
            const myPendingBooking = bookings.find(
                (b) => b.start_hour === startHour && b.booked_by === req.user.id && b.status === 'pending'
            );

            if (approved) {
                const roster = await withRoster(approved);
                // "Mine" isn't just the owner - an approved Pasalo joiner is
                // just as confirmed for this slot, and must NOT see "Join
                // (Pasalo)" again (that re-request 409s on the unique
                // booking_players(booking_id, player_id) constraint).
                const isOwner = approved.booked_by === req.user.id;
                const isJoinedPlayer = roster.players.some((p) => p.player_id === req.user.id);
                if (isOwner || isJoinedPlayer) {
                    slots.push({ startHour, status: 'mine-approved', bookingId: approved.id, ...roster });
                } else {
                    slots.push({ startHour, status: 'approved', bookingId: approved.id, ...roster });
                }
            } else if (myPendingBooking) {
                slots.push({ startHour, status: 'mine-pending' });
            } else if (bookings.some((b) => b.start_hour === startHour && b.status === 'pending')) {
                slots.push({ startHour, status: 'requestable' }); // manual court: others are pending too, you can still ask
            } else {
                slots.push({ startHour, status: 'available' });
            }
        }

        res.json({ court: { id: court.id, approvalType: court.approval_type }, slots });
    } catch (error) {
        next(error);
    }
}

module.exports = { createCourt, listMyCourts, listCourtsByLocation, getAvailability };