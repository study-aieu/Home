const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Draft CRUD operations
router.post('/', validate('saveDraft'), draftController.saveDraft);
router.get('/', draftController.getDrafts);
router.get('/:draftId', draftController.getDraft);
router.put('/:draftId', validate('updatePost'), draftController.updateDraft);
router.delete('/:draftId', draftController.deleteDraft);

// Publish draft to WordPress
router.post('/:draftId/publish', draftController.publishDraft);

module.exports = router;