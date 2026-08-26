const { query } = require('../config/db');
const { redisClient, isConnected } = require('../config/redis');

const PUBLIC_CACHE_TTL_SECONDS = 60;
const publicCacheKey = (id) => `community:project:${id}`;

async function getCached(key) {
  if (!isConnected()) return null;
  const cached = await redisClient.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCached(key, value) {
  if (!isConnected()) return;
  await redisClient.set(key, JSON.stringify(value), { EX: PUBLIC_CACHE_TTL_SECONDS });
}

async function deleteCached(key) {
  if (!isConnected()) return;
  await redisClient.del(key);
}

/**
 * Create a project. canvas_data is passed as a JS object — node-postgres
 * serializes it to JSON automatically when the column type is JSONB.
 */
async function createProject({ userId, title, description, canvasData }) {
  const result = await query(
    `INSERT INTO projects (user_id, title, description, canvas_data)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, title, description, is_public, canvas_data, updated_at`,
    [userId, title, description || null, canvasData || { nodes: [], edges: [] }]
  );
  return result.rows[0];
}

/**
 * Fetch a project by id, scoped to its owner (used for the private/editor view).
 */
async function getOwnedProject({ id, userId }) {
  const result = await query(
    `SELECT id, user_id, title, description, is_public, canvas_data, updated_at
     FROM projects
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

async function listProjectsForUser(userId) {
  const result = await query(
    `SELECT id, title, description, is_public, updated_at
     FROM projects
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Update a project's editable fields, including the React Flow canvas
 * (nodes/edges). Only touches columns that were actually provided.
 * Invalidates the public cache entry so viewers see fresh data —
 * regardless of whether is_public is currently true, in case it was
 * just toggled off (nothing to lose) or stays on (must be fresh).
 */
async function updateProject({ id, userId, title, description, canvasData, isPublic }) {
  const result = await query(
    `UPDATE projects
     SET title       = COALESCE($3, title),
         description = COALESCE($4, description),
         canvas_data = COALESCE($5, canvas_data),
         is_public   = COALESCE($6, is_public),
         updated_at  = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, title, description, is_public, canvas_data, updated_at`,
    [id, userId, title ?? null, description ?? null, canvasData ?? null, isPublic ?? null]
  );

  const updated = result.rows[0] || null;

  if (updated) {
    await deleteCached(publicCacheKey(id));
  }

  return updated;
}

async function deleteProject({ id, userId }) {
  const result = await query(
    `DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (result.rowCount > 0) {
    await deleteCached(publicCacheKey(id));
  }

  return result.rowCount > 0;
}

/**
 * Public read path: Redis-first, Postgres on miss, write-through cache.
 * Only ever returns projects where is_public = true.
 */
async function getPublicProject(id) {
  const cacheKey = publicCacheKey(id);

  const cached = await getCached(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const result = await query(
    `SELECT id, title, description, canvas_data, updated_at
     FROM projects
     WHERE id = $1 AND is_public = true`,
    [id]
  );

  const project = result.rows[0] || null;
  if (!project) {
    return { data: null, fromCache: false };
  }

  await setCached(cacheKey, project);

  return { data: project, fromCache: false };
}

const PUBLIC_LIST_CACHE_TTL_SECONDS = 30;
const publicListCacheKey = (page, limit) => `community:projects:${page}:${limit}`;

async function listPublicProjects({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const cacheKey = publicListCacheKey(page, limit);

  const cached = await getCached(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const result = await query(
    `SELECT id, title, description, updated_at
     FROM projects
     WHERE is_public = true
     ORDER BY updated_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const projects = result.rows;
  await setCached(cacheKey, projects);

  return { data: projects, fromCache: false };
}

module.exports = {
  createProject,
  getOwnedProject,
  listProjectsForUser,
  updateProject,
  deleteProject,
  getPublicProject,
  listPublicProjects,
};
