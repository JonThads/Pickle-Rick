const express = require('express');
const itemController = require('../controllers/itemController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// mergeParams: true - this router is mounted at /api/courts/:courtId/items
// in app.js, and needs access to that :courtId param.
const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, itemController.listItems);
router.post('/', requireAuth, requireRole('admin'), itemController.createItem);
router.patch('/:itemId', requireAuth, requireRole('admin'), itemController.updateItem);
router.delete('/:itemId', requireAuth, requireRole('admin'), itemController.deleteItem);

module.exports = router;
