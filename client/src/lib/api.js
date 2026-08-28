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
  forkProject: (id) => request(`/api/projects/${id}/fork`, { method: 'POST' }),
  getDashboardStats: () => request('/api/projects/stats/dashboard'),
  getActivityHeatmap: () => request('/api/projects/stats/activity'),

  getPublicProject: (id) => request(`/api/community/projects/${id}`, { auth: false }),
  listPublicProjects: (page = 1, limit = 20) =>
    request(`/api/community/projects?page=${page}&limit=${limit}`, { auth: false }),

  searchUsers: (q) => request(`/api/community/users/search?q=${encodeURIComponent(q)}`, { auth: false }),
  getFollowers: (id) => request(`/api/community/users/${id}/followers`, { auth: false }),
  getFollowing: (id) => request(`/api/community/users/${id}/following`, { auth: false }),
  getFollowStatus: (id) => request(`/api/community/users/${id}/follow-status`, { auth: true }),
  followUser: (id) => request(`/api/community/users/${id}/follow`, { method: 'POST', auth: true }),
  unfollowUser: (id) => request(`/api/community/users/${id}/unfollow`, { method: 'POST', auth: true }),

  uploadImage: (formData) => {
    const token = getToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (res) => {
      if (res.status === 204) return null;
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
      return data;
    });
  },

  getProfile: () => request('/api/auth/me'),
  updateProfile: (payload) => request('/api/auth/me', { method: 'PUT', body: payload }),

  listNotifications: (page = 1, limit = 20, filter = 'all') =>
    request(`/api/notifications?page=${page}&limit=${limit}&filter=${encodeURIComponent(filter)}`, { auth: true }),
  getUnreadNotificationsCount: () => request('/api/notifications/unread-count', { auth: true }),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH', auth: true }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'PATCH', auth: true }),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword }, auth: true }),

  toggleLike: (projectId) => request(`/api/projects/${projectId}/like`, { method: 'POST', auth: true }),
  getLikeCount: (projectId) => request(`/api/projects/${projectId}/likes/count`, { auth: true }),
  getLikeStatus: (projectId) => request(`/api/projects/${projectId}/like`, { auth: true }),
};

export { API_BASE, getToken };
