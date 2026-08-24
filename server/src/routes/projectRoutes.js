const express = require('express');
const { requireAuth } = require('../middleware/auth');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.use(requireAuth);

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
