// =============================================================================
// File upload middleware (multer)
// =============================================================================
// Local-only project (see SRS "Scope: local deployment"), so storing to disk
// inside the container is fine - no S3/cloud bucket needed. The `uploads/`
// folder lives inside backend-node/, which docker-compose already bind-mounts
// to the host, so uploaded files survive container restarts without any
// extra volume config.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    // Prefixed with the user's id + timestamp so two uploads never collide
    // and old photos aren't silently overwritten by a same-named file.
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

const uploadPhoto = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB - plenty for a profile photo
});

module.exports = { uploadPhoto };
