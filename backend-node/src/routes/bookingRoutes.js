const express = require('express');
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Players
router.post('/', requireAuth, bookingController.createBooking);
router.get('/mine', requireAuth, bookingController.listMyBookings);
router.patch('/:id/cancel', requireAuth, bookingController.cancelBooking); // owner or admin, checked in controller
router.post('/:id/join', requireAuth, bookingController.requestToJoin); // "Pasalo" request
router.get('/join-requests/incoming', requireAuth, bookingController.listIncomingJoinRequests);
router.get('/join-requests/outgoing', requireAuth, bookingController.listOutgoingJoinRequests);
router.patch('/join-requests/:joinRequestId', requireAuth, bookingController.respondToJoinRequest);

// Admin
router.get('/court/:courtId', requireAuth, requireRole('admin'), bookingController.listBookingsForCourt);
router.patch('/:id/approve', requireAuth, requireRole('admin'), bookingController.approveBooking);

module.exports = router;