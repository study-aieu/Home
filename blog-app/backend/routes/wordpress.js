const express = require('express');
const router = express.Router();
const wordpressController = require('../controllers/wordpressController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Site management
router.post('/connect-site', validate('connectSite'), wordpressController.connectSite);
router.get('/sites', wordpressController.getSites);

// Post management
router.post('/sites/:siteId/posts', validate('createPost'), wordpressController.createPost);
router.get('/sites/:siteId/posts', wordpressController.getPosts);
router.put('/sites/:siteId/posts/:postId', validate('updatePost'), wordpressController.updatePost);
router.delete('/sites/:siteId/posts/:postId', wordpressController.deletePost);

module.exports = router;