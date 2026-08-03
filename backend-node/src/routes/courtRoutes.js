const express = require('express');
const courtController = require('../controllers/courtController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Players browse courts filtered by their own location.
router.get('/', requireAuth, courtController.listCourtsByLocation);

// Any logged-in role - powers the Player dashboard's calendar/slot picker.
router.get('/:courtId/availability', requireAuth, courtController.getAvailability);

// Admin-only routes.
router.get('/mine', requireAuth, requireRole('admin'), courtController.listMyCourts);
router.post('/', requireAuth, requireRole('admin'), courtController.createCourt);

module.exports = router;