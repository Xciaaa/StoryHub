const projectService = require('../services/projectService');

// Wraps async handlers so thrown/rejected errors reach errorHandler.js
// without a try/catch block in every function below.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Very light shape-check for the React Flow payload. This is intentionally
 * not a full schema validator (consider Zod/Joi as the project grows) —
 * it just guards against obviously malformed writes to canvas_data.
 */
function isValidCanvasData(canvasData) {
  if (canvasData === undefined) return true; // not being updated
  return (
    canvasData !== null &&
    typeof canvasData === 'object' &&
    Array.isArray(canvasData.nodes) &&
    Array.isArray(canvasData.edges)
  );
}

const createProject = asyncHandler(async (req, res) => {
  const { title, description, canvasData, coverImage, genre } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!isValidCanvasData(canvasData)) {
    return res.status(400).json({ error: 'canvasData must be an object with nodes[] and edges[]' });
  }

  const project = await projectService.createProject({
    userId: req.user.id,
    title,
    description,
    canvasData,
    coverImage,
    genre,
  });

  return res.status(201).json(project);
});

const listProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.listProjectsForUser(req.user.id);
  return res.json(projects);
});

const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getOwnedProject({
    id: req.params.id,
    userId: req.user.id,
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  return res.json(project);
});

const updateProject = asyncHandler(async (req, res) => {
  const { title, description, canvasData, isPublic, coverImage, genre } = req.body;

  if (!isValidCanvasData(canvasData)) {
    return res.status(400).json({ error: 'canvasData must be an object with nodes[] and edges[]' });
  }

  const project = await projectService.updateProject({
    id: req.params.id,
    userId: req.user.id,
    title,
    description,
    canvasData,
    isPublic,
    coverImage,
    genre,
  });

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  return res.json(project);
});

const deleteProject = asyncHandler(async (req, res) => {
  const deleted = await projectService.deleteProject({
    id: req.params.id,
    userId: req.user.id,
  });

  if (!deleted) {
    return res.status(404).json({ error: 'Project not found' });
  }

  return res.status(204).send();
});

/**
 * Public read-only endpoint — no auth required. Redis-first with a
 * write-through cache on miss, handled inside projectService.
 */
const getPublicProject = asyncHandler(async (req, res) => {
  const { data, fromCache } = await projectService.getPublicProject(req.params.id);

  if (!data) {
    return res.status(404).json({ error: 'Project not found or not public' });
  }

  res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  return res.json(data);
});

/**
 * Browse all public projects — no auth required.
 * Supports ?page=1&limit=20 pagination.
 */
const listPublicProjects = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));

  const { data, fromCache } = await projectService.listPublicProjects({ page, limit });

  res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  return res.json(data);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await projectService.getDashboardStats(req.user.id);
  return res.json(stats);
});

const getActivityHeatmap = asyncHandler(async (req, res) => {
  const data = await projectService.getActivityHeatmap(req.user.id);
  return res.json(data);
});

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  getPublicProject,
  listPublicProjects,
  getDashboardStats,
  getActivityHeatmap,
};
