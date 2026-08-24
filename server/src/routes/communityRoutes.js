const express = require('express');
const projectController = require('../controllers/projectController');

const router = express.Router();

// No requireAuth here — this is the public sharing surface.
router.get('/projects/:id', projectController.getPublicProject);

module.exports = router;
