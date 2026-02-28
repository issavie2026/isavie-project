const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('token');
}

export async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = { ...options.headers, 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || res.statusText || 'Request failed');
  return data;
}

export const auth = {
  magicLink: (email) => request('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }),
  verify: (token) => request('/auth/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  me: () => request('/auth/me'),
};

export const invites = {
  preview: (token) => request(`/invites/${token}/preview`),
  join: (token) => request(`/invites/${token}/join`, { method: 'POST' }),
};

export const trips = {
  list: () => request('/trips'),
  create: (body) => request('/trips', { method: 'POST', body: JSON.stringify(body) }),
  get: (id) => request(`/trips/${id}`),
  delete: (id) => request(`/trips/${id}`, { method: 'DELETE' }),
  invite: (id) => request(`/trips/${id}/invites`, { method: 'POST' }),
  members: (id) => request(`/trips/${id}/members`),
  patchMember: (tripId, userId, role) =>
    request(`/trips/${tripId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (tripId, userId) => request(`/trips/${tripId}/members/${userId}`, { method: 'DELETE' }),
};

export const itinerary = {
  list: (tripId) => request(`/trips/${tripId}/itinerary`),
  createItem: (tripId, body) => request(`/trips/${tripId}/itinerary/items`, { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (tripId, itemId, body) =>
    request(`/trips/${tripId}/itinerary/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteItem: (tripId, itemId) => request(`/trips/${tripId}/itinerary/items/${itemId}`, { method: 'DELETE' }),
  createChangeRequest: (tripId, itemId, proposed_patch) =>
    request(`/trips/${tripId}/itinerary/items/${itemId}/change-requests`, {
      method: 'POST',
      body: JSON.stringify({ proposed_patch }),
    }),
};

export const changeRequests = {
  list: (tripId, status) =>
    request(`/trips/${tripId}/change-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  approve: (tripId, requestId) =>
    request(`/trips/${tripId}/change-requests/${requestId}/approve`, { method: 'POST' }),
  deny: (tripId, requestId) =>
    request(`/trips/${tripId}/change-requests/${requestId}/deny`, { method: 'POST' }),
};

export const announcements = {
  list: (tripId) => request(`/trips/${tripId}/announcements`),
  create: (tripId, body) =>
    request(`/trips/${tripId}/announcements`, { method: 'POST', body: JSON.stringify(body) }),
  pin: (tripId, id, pinned) =>
    request(`/trips/${tripId}/announcements/${id}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned }),
    }),
};

export const comments = {
  list: (tripId, entityType, entityId) => {
    const q = new URLSearchParams();
    if (entityType) q.set('entityType', entityType);
    if (entityId) q.set('entityId', entityId);
    return request(`/trips/${tripId}/comments?${q}`);
  },
  create: (tripId, entity_type, entity_id, body, attachments = []) =>
    request(`/trips/${tripId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ entity_type, entity_id, body, attachments }),
    }),
  delete: (tripId, commentId) =>
    request(`/trips/${tripId}/comments/${commentId}`, { method: 'DELETE' }),
};

export const notifications = {
  list: () => request('/notifications'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
};

export function exportPdf(tripId) {
  const token = getToken();
  const url = `${API_BASE}/trips/${tripId}/export/itinerary.pdf`;
  return fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((res) => {
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  });
}

export const analytics = {
  event: (event, payload = {}) =>
    request('/analytics/event', { method: 'POST', body: JSON.stringify({ event, payload }) }).catch(() => {}),
};

export const essentials = {
  get: (tripId) => request(`/trips/${tripId}/essentials`),
  patch: (tripId, body) =>
    request(`/trips/${tripId}/essentials`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const polls = {
  list: (tripId) => request(`/trips/${tripId}/polls`),
  create: (tripId, body) =>
    request(`/trips/${tripId}/polls`, { method: 'POST', body: JSON.stringify(body) }),
  vote: (tripId, pollId, body) =>
    request(`/trips/${tripId}/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify(body) }),
  close: (tripId, pollId) =>
    request(`/trips/${tripId}/polls/${pollId}/close`, { method: 'POST' }),
  decide: (tripId, pollId, optionId) =>
    request(`/trips/${tripId}/polls/${pollId}/decide`, { method: 'POST', body: JSON.stringify({ optionId }) }),
};

export const tasks = {
  list: (tripId, params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/trips/${tripId}/tasks?${q}`);
  },
  create: (tripId, body) =>
    request(`/trips/${tripId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  update: (tripId, taskId, body) =>
    request(`/trips/${tripId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  setAssignees: (tripId, taskId, userIds) =>
    request(`/trips/${tripId}/tasks/${taskId}/assignees`, { method: 'POST', body: JSON.stringify({ userIds }) }),
  delete: (tripId, taskId) => request(`/trips/${tripId}/tasks/${taskId}`, { method: 'DELETE' }),
};

export const calendar = {
  getToken: (tripId) => request(`/trips/${tripId}/calendar/token`),
  itemIcsUrl: (tripId, itemId) => `${API_BASE}/trips/${tripId}/calendar/items/${itemId}.ics`,
};

export const albums = {
  list: (tripId) => request(`/trips/${tripId}/albums`),
  add: (tripId, url, label) =>
    request(`/trips/${tripId}/albums`, { method: 'POST', body: JSON.stringify({ url, label: label || '' }) }),
  delete: (tripId, albumId) => request(`/trips/${tripId}/albums/${albumId}`, { method: 'DELETE' }),
};

export const recap = {
  get: (tripId) => request(`/trips/${tripId}/recap`),
  patch: (tripId, body) =>
    request(`/trips/${tripId}/recap`, { method: 'PATCH', body: JSON.stringify(body) }),
  publish: (tripId) => request(`/trips/${tripId}/recap/publish`, { method: 'POST' }),
  getShared: (shareToken) => request(`/recap/shared/${shareToken}`),
};
