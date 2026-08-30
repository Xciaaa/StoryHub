const { query } = require('../config/db');
const {
  redisClient,
  ensureConnected,
  getCached,
  setCached,
  deleteCached,
  deleteCachedMany,
  getCachedMany,
  setCachedMany,
} = require('../config/redis');

const PUBLIC_CACHE_TTL_SECONDS = 60;
const PUBLIC_CACHE_STALE_TTL_SECONDS = 3600;
const PUBLIC_LIST_CACHE_TTL_SECONDS = 30;
const PUBLIC_LIST_CACHE_STALE_TTL_SECONDS = 300;
const CACHE_KEY_VERSION = 'v1';

const publicCacheKey = (id) => `cache:${CACHE_KEY_VERSION}:project:${id}`;
const publicListCacheKey = (page, limit) => `cache:${CACHE_KEY_VERSION}:projects:${page}:${limit}`;
const trendingListCacheKey = () => `cache:${CACHE_KEY_VERSION}:projects:trending`;

async function getCached(key) {
  if (!(await ensureConnected())) return null;
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Redis get error:', err.message);
    return null;
  }
}

async function setCached(key, value, ttlSeconds) {
  if (!(await ensureConnected())) return;
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error('Redis set error:', err.message);
  }
}

async function deleteCached(key) {
  if (!(await ensureConnected())) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error('Redis delete error:', err.message);
  }
}

async function deleteCachedMany(keys) {
  if (!(await ensureConnected())) return;
  if (!Array.isArray(keys) || keys.length === 0) return;
  try {
    const pipeline = redisClient.multi();
    keys.forEach((key) => pipeline.del(key));
    await pipeline.exec();
  } catch (err) {
    console.error('Redis deleteMany error:', err.message);
  }
}

async function getCachedMany(keys) {
  if (!(await ensureConnected())) return [];
  if (!Array.isArray(keys) || keys.length === 0) return [];
  try {
    const values = await redisClient.mGet(keys);
    return values.map((val) => (val ? JSON.parse(val) : null));
  } catch (err) {
    console.error('Redis getMany error:', err.message);
    return [];
  }
}

async function setCachedMany(keyValuePairs, ttlSeconds) {
  if (!(await ensureConnected())) return;
  if (!Array.isArray(keyValuePairs) || keyValuePairs.length === 0) return;
  try {
    const pipeline = redisClient.multi();
    keyValuePairs.forEach(({ key, value }) => {
      pipeline.set(key, JSON.stringify(value), { EX: ttlSeconds });
    });
    await pipeline.exec();
  } catch (err) {
    console.error('Redis setMany error:', err.message);
  }
}

/**
 * Create a project. canvas_data is passed as a JS object — node-postgres
 * serializes it to JSON automatically when the column type is JSONB.
 */
async function createProject({ userId, title, description, canvasData, coverImage, genre }) {
  const result = await query(
    `INSERT INTO projects (user_id, title, description, canvas_data, cover_image, genre)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, description, is_public, canvas_data, cover_image, genre, updated_at`,
    [userId, title, description || null, canvasData || { nodes: [], edges: [] }, coverImage || null, genre || null]
  );
  return result.rows[0];
}

/**
 * Fetch a project by id, scoped to its owner (used for the private/editor view).
 */
async function getOwnedProject({ id, userId }) {
  const result = await query(
    `SELECT id, user_id, title, description, is_public, canvas_data, cover_image, genre, updated_at
     FROM projects
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

async function listProjectsForUser(userId) {
  const result = await query(
    `SELECT id, title, description, is_public, canvas_data, cover_image, genre, updated_at
     FROM projects
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    is_public: row.is_public,
    canvas_data: row.canvas_data || { nodes: [], edges: [] },
    cover_image: row.cover_image || null,
    genre: row.genre || null,
    updated_at: row.updated_at,
    node_count: (row.canvas_data?.nodes || []).length,
  }));
}

/**
 * Update a project's editable fields, including the React Flow canvas
 * (nodes/edges). Only touches columns that were actually provided.
 * Invalidates the public cache entry so viewers see fresh data —
 * regardless of whether is_public is currently true, in case it was
 * just toggled off (nothing to lose) or stays on (must be fresh).
 */
async function updateProject({ id, userId, title, description, canvasData, isPublic, coverImage, genre }) {
  const result = await query(
    `UPDATE projects
     SET title        = COALESCE($3, title),
         description  = COALESCE($4, description),
         canvas_data  = COALESCE($5, canvas_data),
         is_public    = COALESCE($6, is_public),
         cover_image  = COALESCE($7, cover_image),
         genre        = COALESCE($8, genre),
         updated_at   = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, title, description, is_public, canvas_data, cover_image, genre, updated_at`,
    [id, userId, title ?? null, description ?? null, canvasData ?? null, isPublic ?? null, coverImage ?? null, genre ?? null]
  );

  const updated = result.rows[0] || null;

  if (updated) {
    await invalidateProjectCaches(id);
    await recordProjectActivity({
      projectId: id,
      userId,
      action: 'update',
      canvasData: updated.canvas_data || { nodes: [], edges: [] },
    });
  }

  return updated;
}

async function deleteProject({ id, userId }) {
  const result = await query(
    `DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (result.rowCount > 0) {
    await invalidateProjectCaches(id);
  }

  return result.rowCount > 0;
}

async function invalidateProjectCaches(projectId) {
  const keysToDelete = [
    publicCacheKey(projectId),
    publicListCacheKey(1, 20),
    publicListCacheKey(1, 100),
    trendingListCacheKey(),
  ];
  await deleteCachedMany(keysToDelete);
}

async function recordProjectActivity({ projectId, userId, action, canvasData }) {
  const nodesCount = (canvasData?.nodes || []).length;
  const edgesCount = (canvasData?.edges || []).length;
  await query(
    `INSERT INTO project_activity (project_id, user_id, action, nodes_count, edges_count)
     VALUES ($1, $2, $3, $4, $5)`,
    [projectId, userId, action, nodesCount, edgesCount]
  );
}

async function getDashboardStats(userId) {
  const projectsResult = await query(
    `SELECT id, canvas_data FROM projects WHERE user_id = $1`,
    [userId]
  );

  const totalNodes = projectsResult.rows.reduce((sum, p) => sum + ((p.canvas_data?.nodes || []).length), 0);
  const totalEdges = projectsResult.rows.reduce((sum, p) => sum + ((p.canvas_data?.edges || []).length), 0);

  const activityResult = await query(
    `SELECT created_at FROM project_activity WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const editsThisWeek = activityResult.rows.filter((r) => new Date(r.created_at) >= weekAgo).length;

  const wordCount = Math.round(totalNodes * 47 + totalEdges * 12);

  return {
    totalNodes,
    totalEdges,
    connections: totalEdges,
    wordsMapped: wordCount,
    editsThisWeek,
  };
}

async function getActivityHeatmap(userId) {
  const result = await query(
    `SELECT created_at FROM project_activity WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const activityMap = new Map();
  for (const row of result.rows) {
    const d = new Date(row.created_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    activityMap.set(key, (activityMap.get(key) || 0) + 1);
  }

  return days.map((d) => ({
    date: d.toISOString(),
    count: activityMap.get(d.toISOString()) || 0,
  }));
}

/**
 * Public read path: Redis-first, Postgres on miss, write-through cache.
 * Only ever returns projects where is_public = true.
 */
async function getPublicProject(id) {
  const cacheKey = publicCacheKey(id);
  const staleKey = `${cacheKey}:stale`;

  const cached = await getCached(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const stale = await getCached(staleKey);
  if (stale) {
    refreshPublicProjectCacheInBackground(id, cacheKey, staleKey);
    return { data: stale, fromCache: true, stale: true };
  }

  const result = await query(
    `SELECT p.id, p.title, p.description, p.cover_image, p.genre, p.canvas_data, p.updated_at, p.user_id, u.username, u.avatar,
            COUNT(DISTINCT l.user_id) AS like_count,
            COUNT(DISTINCT f2.id) AS fork_count
     FROM projects p
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN likes l ON l.project_id = p.id
     LEFT JOIN projects f2 ON f2.parent_project_id = p.id
     WHERE p.id = $1 AND p.is_public = true
     GROUP BY p.id, u.username, u.avatar`,
    [id]
  );

  const project = result.rows[0] || null;
  if (!project) {
    return { data: null, fromCache: false };
  }

  const enriched = {
    ...project,
    like_count: parseInt(project.like_count || '0', 10),
    fork_count: parseInt(project.fork_count || '0', 10),
    trending_score: (parseInt(project.like_count || '0', 10) * 2) + (parseInt(project.fork_count || '0', 10) * 3),
  };

  await setCached(cacheKey, enriched, PUBLIC_CACHE_TTL_SECONDS);
  await setCached(staleKey, enriched, PUBLIC_CACHE_STALE_TTL_SECONDS);

  return { data: enriched, fromCache: false };
}

async function refreshPublicProjectCacheInBackground(id, cacheKey, staleKey) {
  try {
    const result = await query(
      `SELECT p.id, p.title, p.description, p.cover_image, p.genre, p.canvas_data, p.updated_at, p.user_id, u.username, u.avatar,
              COUNT(DISTINCT l.user_id) AS like_count,
              COUNT(DISTINCT f2.id) AS fork_count
       FROM projects p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON l.project_id = p.id
       LEFT JOIN projects f2 ON f2.parent_project_id = p.id
       WHERE p.id = $1 AND p.is_public = true
       GROUP BY p.id, u.username, u.avatar`,
      [id]
    );

    const project = result.rows[0] || null;
    if (!project) return null;

    const enriched = {
      ...project,
      like_count: parseInt(project.like_count || '0', 10),
      fork_count: parseInt(project.fork_count || '0', 10),
      trending_score: (parseInt(project.like_count || '0', 10) * 2) + (parseInt(project.fork_count || '0', 10) * 3),
    };

    await setCached(cacheKey, enriched, PUBLIC_CACHE_TTL_SECONDS);
    await setCached(staleKey, enriched, PUBLIC_CACHE_STALE_TTL_SECONDS);
    return enriched;
  } catch (err) {
    console.error('Background project cache refresh failed:', err.message);
    return null;
  }
}

const PUBLIC_LIST_CACHE_TTL_SECONDS = 30;
const PUBLIC_LIST_CACHE_STALE_TTL_SECONDS = 300;
const publicListCacheKey = (page, limit) => `cache:${CACHE_KEY_VERSION}:projects:${page}:${limit}`;
const trendingListCacheKey = () => `cache:${CACHE_KEY_VERSION}:projects:trending`;

async function listPublicProjects({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const cacheKey = publicListCacheKey(page, limit);

  const cached = await getCached(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const staleKey = `${cacheKey}:stale`;
  const stale = await getCached(staleKey);
  if (stale) {
    refreshPublicListCacheInBackground(page, limit, cacheKey, staleKey);
    return { data: stale, fromCache: true, stale: true };
  }

  const { data, fromCache } = await fetchAndCachePublicProjects(page, limit, cacheKey, staleKey);
  return { data, fromCache };
}

async function fetchAndCachePublicProjects(page, limit, cacheKey, staleKey) {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT 
       p.id, p.title, p.description, p.cover_image, p.genre, p.updated_at, p.user_id, u.username, u.avatar,
       COUNT(DISTINCT l.user_id) AS like_count,
       COUNT(DISTINCT f2.id) AS fork_count
     FROM projects p
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN likes l ON l.project_id = p.id
     LEFT JOIN projects f2 ON f2.parent_project_id = p.id
     WHERE p.is_public = true
     GROUP BY p.id, u.username, u.avatar
     ORDER BY 
       (COUNT(DISTINCT l.user_id) * 2 + COUNT(DISTINCT f2.id) * 3 + EXTRACT(EPOCH FROM (NOW() - p.updated_at)) * -0.0001) DESC,
       p.updated_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const projects = result.rows.map((row) => ({
    ...row,
    like_count: parseInt(row.like_count || '0', 10),
    fork_count: parseInt(row.fork_count || '0', 10),
    trending_score: (parseInt(row.like_count || '0', 10) * 2) + (parseInt(row.fork_count || '0', 10) * 3),
  }));

  await setCached(cacheKey, projects, PUBLIC_LIST_CACHE_TTL_SECONDS);
  await setCached(staleKey, projects, PUBLIC_LIST_CACHE_STALE_TTL_SECONDS);

  return { data: projects, fromCache: false };
}

async function refreshPublicListCacheInBackground(page, limit, cacheKey, staleKey) {
  try {
    const { data } = await fetchAndCachePublicProjects(page, limit, cacheKey, staleKey);
    return data;
  } catch (err) {
    console.error('Background cache refresh failed:', err.message);
    return null;
  }
}

async function saveProject({ userId, projectId }) {
  try {
    await query(
      `INSERT INTO saved_projects (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, projectId]
    );
    return true;
  } catch (err) {
    if (err.message && err.message.includes('saved_projects')) {
      console.error('[Server] saved_projects table missing on save:', err.message);
      throw new Error('Library feature not initialized. Please restart the server.');
    }
    throw err;
  }
}

async function unsaveProject({ userId, projectId }) {
  try {
    await query(
      `DELETE FROM saved_projects WHERE user_id = $1 AND project_id = $2`,
      [userId, projectId]
    );
    return true;
  } catch (err) {
    if (err.message && err.message.includes('saved_projects')) {
      console.error('[Server] saved_projects table missing on unsave:', err.message);
      throw new Error('Library feature not initialized. Please restart the server.');
    }
    throw err;
  }
}

async function isProjectSaved({ userId, projectId }) {
  try {
    const result = await query(
      `SELECT 1 FROM saved_projects WHERE user_id = $1 AND project_id = $2 LIMIT 1`,
      [userId, projectId]
    );
    return !!result.rows[0];
  } catch (err) {
    if (err.message && err.message.includes('saved_projects')) {
      console.error('[Server] saved_projects table missing on status check:', err.message);
      return false;
    }
    throw err;
  }
}

async function listSavedProjects({ userId, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  try {
    const result = await query(
      `SELECT 
         p.id, p.title, p.description, p.cover_image, p.genre, p.updated_at, p.user_id, p.canvas_data,
         u.username,
         COUNT(DISTINCT l.user_id) AS like_count,
         COUNT(DISTINCT f2.id) AS fork_count,
         sp.created_at AS saved_at
       FROM saved_projects sp
       JOIN projects p ON p.id = sp.project_id
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON l.project_id = p.id
       LEFT JOIN projects f2 ON f2.parent_project_id = p.id
       WHERE sp.user_id = $1 AND p.is_public = true
       GROUP BY p.id, u.username, sp.created_at, p.title, p.description, p.cover_image, p.genre, p.updated_at, p.user_id, p.canvas_data
       ORDER BY sp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const projects = result.rows.map((row) => ({
      ...row,
      like_count: parseInt(row.like_count || '0', 10),
      fork_count: parseInt(row.fork_count || '0', 10),
    }));

    return projects;
  } catch (err) {
    if (err.message && err.message.includes('saved_projects')) {
      console.error('[Server] saved_projects table missing or query failed:', err.message);
      return [];
    }
    throw err;
  }
}

async function forkProject({ projectId, userId }) {
  const original = await query(
    'SELECT id, title, description, canvas_data, cover_image, genre, user_id FROM projects WHERE id = $1',
    [projectId]
  ).then(r => r.rows[0]);

  if (!original) return null;

  const result = await query(
    `INSERT INTO projects (user_id, title, description, canvas_data, cover_image, genre, parent_project_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, title, description, is_public, canvas_data, cover_image, genre, updated_at`,
    [
      userId,
      `${original.title} (Fork)`,
      original.description,
      original.canvas_data || { nodes: [], edges: [] },
      original.cover_image,
      original.genre,
      projectId,
    ]
  );

  return result.rows[0];
}

module.exports = {
  createProject,
  getOwnedProject,
  listProjectsForUser,
  updateProject,
  deleteProject,
  getPublicProject,
  listPublicProjects,
  recordProjectActivity,
  getDashboardStats,
  getActivityHeatmap,
  forkProject,
  saveProject,
  unsaveProject,
  isProjectSaved,
  listSavedProjects,
};
