// =============================================================================
// Booking model
// =============================================================================
// This file covers both the `bookings` table and the `booking_players` table
// (the "Pasalo" join-request feature from the Business Rules doc).

const pool = require('../config/db');

const MAX_PLAYERS_PER_BOOKING = 8; // BR-06: "Only a maximum of 8 players in that timeslot, including the owner"

/**
 * Create a booking for one hour slot on one court/date (BR-03, FR-06).
 * The UNIQUE constraint on (court_id, booking_date, start_hour) in the
 * database is what actually prevents double-booking - this function will
 * throw if that constraint is violated, and the controller turns that into
 * a friendly 409 response.
 */

async function createBooking({ courtId, bookedBy, bookingDate, startHour, status }) {
    const result = await pool.query(
        `INSERT INTO bookings (court_id, booked_by, booking_date, start_hour, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [courtId, bookedBy, bookingDate, startHour, status]
    );
    return result.rows[0];
}

/**
 * All bookings for one court on one day - this is what the Admin dashboard
 * shows in UC-05-02 ("Admin sees all hour time slots").
 */

async function findBookingsForCourtOnDate(courtId, bookingDate) {
    const result = await pool.query(
        `SELECT * FROM bookings
         WHERE court_id = $1 AND booking_date = $2
         ORDER BY start_hour ASC`,
        [courtId, bookingDate]
    );

    return result.rows;
}

/**
 * A single player's own bookings, across every court - this powers the
 * "My Bookings" page from BR-06.
 */

async function findBookingsForPlayer(playerId) {
    const result = await pool.query(
        `SELECT b.*, c.name AS court_name, c.location AS court_location
         FROM bookings b
         JOIN courts c ON c.id = b.court_id
         WHERE b.booked_by = $1
         ORDER BY b.booking_date DESC, b.start_hour ASC`,
        [playerId]
    );

    return result.rows;
}

/**
 * Look a booking up by id - used by the controller to check ownership /
 * existence before approving, cancelling, or accepting a join request.
 */

async function findBookingById(bookingId) {
    const result = await pool.query(
        `SELECT *
         FROM bookings
         WHERE id = $1`,
        [bookingId]
    );

    return result.rows[0] || null;
}

async function updateBookingStatus(bookingId, status) {
    const result = await pool.query(
        `UPDATE bookings
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, bookingId]
    );

    return result.rows[0] || null;
}

/**
 * UC-05-02 (Admin): once the admin approves one player's request for a
 * contested slot, every other still-PENDING request for that same
 * court/date/hour is cancelled. Only touches 'pending' rows, so it never
 * clobbers a booking that's already 'approved' or 'cancelled'.
 */

async function cancelOtherPendingBookingsForSlot(bookingId, courtId, bookingDate, startHour) {
    const result = await pool.query(
        `UPDATE bookings
         SET status = 'cancelled'
         WHERE court_id = $1 AND booking_date = $2 AND start_hour = $3
           AND id != $4 AND status = 'pending'
         RETURNING *`,
        [courtId, bookingDate, startHour, bookingId]
    );

    return result.rows;
}

/**
 * Same as findBookingsForCourtOnDate, but joined to the owner's profile -
 * this is what the Admin court-detail accordion (UC-05-02) needs to show
 * who requested/holds each slot.
 */

async function findBookingsForCourtOnDateDetailed(courtId, bookingDate) {
    const result = await pool.query(
        `SELECT b.*, u.full_name AS owner_name, u.photo_url AS owner_photo_url
         FROM bookings b
         JOIN users u ON u.id = b.booked_by
         WHERE b.court_id = $1 AND b.booking_date = $2
         ORDER BY b.start_hour ASC`,
        [courtId, bookingDate]
    );

    return result.rows;
}

/**
 * The approved "Pasalo" participants for one booking (the owner is NOT
 * included here - they're already on the booking row itself).
 */

async function findApprovedPlayersForBooking(bookingId) {
    const result = await pool.query(
        `SELECT bp.id AS join_request_id, u.id AS player_id, u.full_name, u.photo_url
         FROM booking_players bp
         JOIN users u ON u.id = bp.player_id
         WHERE bp.booking_id = $1 AND bp.status = 'approved'
         ORDER BY bp.requested_at ASC`,
        [bookingId]
    );

    return result.rows;
}

/**
 * Pending "Pasalo" join requests on bookings owned by this player - what
 * the Player dashboard's "Incoming requests" section approves/rejects.
 */

async function findPendingJoinRequestsForOwner(ownerId) {
    const result = await pool.query(
        `SELECT bp.*, u.full_name AS requester_name, u.photo_url AS requester_photo_url,
                b.court_id, b.booking_date, b.start_hour, c.name AS court_name
         FROM booking_players bp
         JOIN bookings b ON b.id = bp.booking_id
         JOIN users u ON u.id = bp.player_id
         JOIN courts c ON c.id = b.court_id
         WHERE b.booked_by = $1 AND bp.status = 'pending'
         ORDER BY b.booking_date ASC, b.start_hour ASC`,
        [ownerId]
    );

    return result.rows;
}

/**
 * Join requests this player has SENT (to other players' bookings), with
 * their current status - the Player dashboard's "Outgoing requests" section.
 */

async function findJoinRequestsByPlayer(playerId) {
    const result = await pool.query(
        `SELECT bp.*, b.court_id, b.booking_date, b.start_hour, c.name AS court_name
         FROM booking_players bp
         JOIN bookings b ON b.id = bp.booking_id
         JOIN courts c ON c.id = b.court_id
         WHERE bp.player_id = $1
         ORDER BY b.booking_date DESC, b.start_hour ASC`,
        [playerId]
    );

    return result.rows;
}

// -----------------------------------------------------------------------------
// "Pasalo" join requests
// -----------------------------------------------------------------------------

/**
 * How many players currently hold an "approved" seat in this booking -
 * used to enforce the 8-player cap before approving a new join request.
 */

async function countApprovedPlayers(bookingId) {
    const result = await pool.query(
        `SELECT COUNT(*):: int AS count
         FROM booking_players
         WHERE booking_id = $1 AND status = 'approved'`,
        [bookingId]
    );

    return result.rows[0].count;
}

async function requestToJoinBooking(bookingId, playerId) {
    const result = await pool.query(
        `INSERT INTO booking_players (booking_id, player_id, status)
         VALUES ($1, $2, 'pending')
         RETURNING *`,
        [bookingId, playerId]
    );

    return result.rows[0];
}

async function respondToJoinRequest(bookingPlayerId, approve) {
  const result = await pool.query(
    `UPDATE booking_players
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [approve ? 'approved' : 'disapproved', bookingPlayerId]
  );

  return result.rows[0] || null;
}

async function findJoinRequestById(bookingPlayerId) {
  const result = await pool.query(
    `SELECT *
     FROM booking_players
     WHERE id = $1`,
    [bookingPlayerId]
  );
  
  return result.rows[0] || null;
}

module.exports = {
  MAX_PLAYERS_PER_BOOKING,
  createBooking,
  findBookingsForCourtOnDate,
  findBookingsForCourtOnDateDetailed,
  findBookingsForPlayer,
  findBookingById,
  updateBookingStatus,
  cancelOtherPendingBookingsForSlot,
  countApprovedPlayers,
  findApprovedPlayersForBooking,
  findPendingJoinRequestsForOwner,
  findJoinRequestsByPlayer,
  requestToJoinBooking,
  respondToJoinRequest,
  findJoinRequestById,
};