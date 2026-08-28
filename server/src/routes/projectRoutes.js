const express = require('express');
const { requireAuth } = require('../middleware/auth');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.use(requireAuth);

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/saved', projectController.listSavedProjects);
router.get('/stats/dashboard', projectController.getDashboardStats);
router.get('/stats/activity', projectController.getActivityHeatmap);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.post('/:id/fork', projectController.forkProject);
router.post('/:id/save', projectController.saveProject);
router.delete('/:id/save', projectController.unsaveProject);
router.get('/:id/save', projectController.getSaveStatus);

module.exports = router;
