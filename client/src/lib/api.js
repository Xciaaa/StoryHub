const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

/**
 * Wraps fetch: prefixes API_BASE, attaches Authorization header when a
 * token exists, parses JSON, and throws an Error with the server's
 * message on non-2xx responses so callers can catch() a single type.
 */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content — nothing to parse
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response body; leave data as null
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),

  listProjects: () => request('/api/projects'),
  getProject: (id) => request(`/api/projects/${id}`),
  createProject: (payload) => request('/api/projects', { method: 'POST', body: payload }),
  updateProject: (id, payload) => request(`/api/projects/${id}`, { method: 'PUT', body: payload }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
  getDashboardStats: () => request('/api/projects/stats/dashboard'),
  getActivityHeatmap: () => request('/api/projects/stats/activity'),

  getPublicProject: (id) => request(`/api/community/projects/${id}`, { auth: false }),
  listPublicProjects: (page = 1, limit = 20) =>
    request(`/api/community/projects?page=${page}&limit=${limit}`, { auth: false }),
};

export { getToken };
