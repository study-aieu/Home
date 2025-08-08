const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Image upload routes
router.post('/local', uploadController.getUploadMiddleware(), uploadController.uploadLocal);
router.post('/wordpress/:siteId', uploadController.getUploadMiddleware(), uploadController.uploadToWordPress);

// Media library
router.get('/wordpress/:siteId/media', uploadController.getMediaLibrary);

module.exports = router;