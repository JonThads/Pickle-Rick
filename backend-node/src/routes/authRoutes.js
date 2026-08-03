const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadPhoto } = require('../middleware/upload');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateMe);
// requireAuth must run before uploadPhoto - the upload middleware's disk
// storage config needs req.user.id to name the file.
router.post('/me/photo', requireAuth, uploadPhoto.single('photo'), authController.uploadPhoto);

module.exports = router;
