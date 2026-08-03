// =============================================================================
// Booking controller
// =============================================================================
// Covers BR-03, BR-04, FR-02 to FR-08, UC-05-01, UC-05-02, and the "Pasalo" rules.

const Booking = require('../models/Booking');
const Court = require('../models/Court');

/**
 * POST /api/bookings  (any logged-in player)
 * FR-03/FR-04: the court's `approval_type` decides whether the new booking
 * is immediately "approved" or sits as "pending" until the admin acts on it.
 */

async function createBooking(req, res, next) {
    try {
        const { courtId, bookingDate, startHour } = req.body;
        if (!courtId || ! bookingDate || startHour == null) {
            return res.status(400).json({ error: 'courtId, bookingDate, and startHour are required' });
        }

        const court = await Court.findCourtById(courtId);
        if (!court) {
            return res.status(404).json({ error: 'Court not found' });
        }

        // Stop the same player from submitting a second request for a slot
        // they already hold (pending or approved) - not a documented rule by
        // ID, but a sane guard against accidental double-submits.
        const existing = await Booking.findBookingsForCourtOnDate(courtId, bookingDate);
        const alreadyRequested = existing.some(
            (b) => b.start_hour === startHour && b.booked_by === req.user.id && b.status !== 'cancelled'
        );
        if (alreadyRequested) {
            return res.status(409).json({ error: 'You already have a request for this slot' });
        }

        // FR-02/FR-03/FR-04: this single line is the entire "auto vs manual
        // approval" business rule - everything else in the app just reacts to
        // whatever status ends up here.

        const status = court.approval_type === 'auto' ? 'approved' : 'pending';

        const booking = await Booking.createBooking({
            courtId,
            bookedBy: req.user.id,
            bookingDate,
            startHour,
            status,
        });

        res.status(201).json({ booking });
    } catch (error) {

        // The DB's UNIQUE(court_id, booking_date, start_hour) constraint fires
        // if this exact slot is already taken - errorHandler.js turns that into
        // a clean 409 response (see PG_UNIQUE_VIOLATION there), so we don't
        // need to duplicate that check here in application code.

    next(error);
    }
}

/**
 * GET /api/bookings/court/:courtId?date=YYYY-MM-DD  (admin view - UC-05-02 step 2)
 */

async function listBookingsForCourt(req, res, next) {
    try {
        const { courtId } = req.params;
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'date query param (YYYY-MM-DD) is required' });
        }

        // Detailed (joined to the owner's profile) so the Admin court-detail
        // accordion can show who requested/holds each slot, plus that
        // booking's approved Pasalo participants.
        const bookings = await Booking.findBookingsForCourtOnDateDetailed(courtId, date);
        const withPlayers = await Promise.all(
            bookings.map(async (booking) => ({
                ...booking,
                players: booking.status === 'approved' ? await Booking.findApprovedPlayersForBooking(booking.id) : [],
            }))
        );

        res.json({ bookings: withPlayers });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/bookings/mine  (any logged-in player)
 * BR-06: "My Bookings" page.
 */

async function listMyBookings(req, res, next) {
    try {
        const bookings = await Booking.findBookingsForPlayer(req.user.id);
        // Attach each approved booking's Pasalo participants, so "My
        // Bookings" can show who else is playing.
        const withPlayers = await Promise.all(
            bookings.map(async (booking) => ({
                ...booking,
                players: booking.status === 'approved' ? await Booking.findApprovedPlayersForBooking(booking.id) : [],
            }))
        );
        res.json({ bookings: withPlayers });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/bookings/:id/approve  (admin only)
 * UC-05-02 (Admin flow): admin approves one player's booking for a
 * contested slot; every other pending booking for that same slot should be
 * cancelled (Result step 3 in the use case doc). We keep that "cancel the
 * rest" logic here in the controller so it's easy to read end-to-end.
 */

async function approveBooking(req, res, next) {
    try {
        const { id } = req.params;
        const booking = await Booking.findBookingById(id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const approved = await Booking.updateBookingStatus(id, 'approved');

        // UC-05-02 (Admin) Result step 3: "All other players' bookings for the
        // same time slot are cancelled." Competing PENDING requests for this
        // exact court/date/hour can coexist (see the partial unique index in
        // schema.sql), so once one is approved the rest lose automatically.
        await Booking.cancelOtherPendingBookingsForSlot(
            id,
            booking.court_id,
            booking.booking_date,
            booking.start_hour
        );

        res.json({ booking: approved });

    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/bookings/:id/cancel  (admin OR the player who owns the booking)
 * BRD Business Process: "Cancellation of user bookings by the Admins".
 */

async function cancelBooking(req, res, next) {
    try {
        const { id } = req.params;
        const booking = await Booking.findBookingById(id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const isOwner = booking.booked_by === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'You do not have permission to cancel this booking' });
        }

        const cancelled = await Booking.updateBookingStatus(id, 'cancelled');
        res.json({ booking: cancelled });
    } catch (error) {
        next(error);
    }
}

// -----------------------------------------------------------------------------
// "Pasalo" join requests
// -----------------------------------------------------------------------------

/**
 * POST /api/bookings/:id/join  (any logged-in player wanting to "pasalo" in)
 * FR-08 / Business Rules doc.
 */

async function requestToJoin(req, res, next) {
    try {
        const { id } = req.params;
        const booking = await Booking.findBookingById(id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // MAX_PLAYERS_PER_BOOKING counts the booking OWNER too (BR: "max 8
        // players in that timeslot"), but countApprovedPlayers only counts
        // booking_players rows (joiners) - so the joiner cap is one less.
        const approvedCount = await Booking.countApprovedPlayers(id);
        if (approvedCount >= Booking.MAX_PLAYERS_PER_BOOKING - 1) {
            return res.status(409).json({ error: 'This booking already has the maximum of 8 players' });
        }

        const joinRequest = await Booking.requestToJoinBooking(id, req.user.id);
        res.status(201).json({ joinRequest });
    } catch (error) {
        next(error);
    }
}

/**
 * PATCH /api/bookings/join-requests/:joinRequestId
 * Body: { approve: true | false }
 * Only the original booker (booking.booked_by) may approve/disapprove -
 * that check is what makes this "Player A approves Player B", not an admin
 * action.
 */

async function respondToJoinRequest(req, res, next) {
    try {
        const { joinRequestId } = req.params;
        const { approve } = req.body;

        const joinRequest = await Booking.findJoinRequestById(joinRequestId);
        if (!joinRequest) {
            return res.status(404).json({ error: 'Join request not found' });
        }

        const booking = await Booking.findBookingById(joinRequest.booking_id);
        if (booking.booked_by !== req.user.id) {
            return res.status(403).json({ error: 'You do not have permission to approve/disapprove this join request' });
        }

        if (approve) {
            const approvedCount = await Booking.countApprovedPlayers(joinRequest.booking_id);
            if (approvedCount >= Booking.MAX_PLAYERS_PER_BOOKING - 1) {
                return res.status(409).json({ error: 'This booking already has the maximum of 8 players' });
            }
        }

        const updated = await Booking.respondToJoinRequest(joinRequestId, Boolean(approve));
        res.json({ joinRequest: updated });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/bookings/join-requests/incoming  (any logged-in player)
 * Pending Pasalo requests on bookings I OWN - the ones I get to approve or
 * disapprove (FR-08).
 */

async function listIncomingJoinRequests(req, res, next) {
    try {
        const joinRequests = await Booking.findPendingJoinRequestsForOwner(req.user.id);
        res.json({ joinRequests });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/bookings/join-requests/outgoing  (any logged-in player)
 * Pasalo requests I've SENT to join other players' bookings, with status.
 */

async function listOutgoingJoinRequests(req, res, next) {
    try {
        const joinRequests = await Booking.findJoinRequestsByPlayer(req.user.id);
        res.json({ joinRequests });
    } catch (error) {
        next(error);
    }
}

module.exports = {
  createBooking,
  listBookingsForCourt,
  listMyBookings,
  approveBooking,
  cancelBooking,
  requestToJoin,
  respondToJoinRequest,
  listIncomingJoinRequests,
  listOutgoingJoinRequests,
};