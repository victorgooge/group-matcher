const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({ message: 'Request failed.' }));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

export const authApi = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/auth/me')
};

export const usersApi = {
  getMe: () => apiFetch('/users/me'),
  updateMe: (body) => apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(body) }),
  addAvailability: (body) => apiFetch('/users/me/availability', { method: 'POST', body: JSON.stringify(body) }),
  deleteAvailability: (availabilityId) => apiFetch(`/users/me/availability/${availabilityId}`, { method: 'DELETE' }),
  getReliability: (userId) => apiFetch(`/users/${userId}/reliability`),
  getRatings: (userId) => apiFetch(`/users/${userId}/ratings`)
};

export const groupsApi = {
  list: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.meetingFormat) searchParams.set('meetingFormat', params.meetingFormat);
    const query = searchParams.toString();
    return apiFetch(`/groups${query ? `?${query}` : ''}`);
  },
  mine: () => apiFetch('/groups/mine'),
  get: (id) => apiFetch(`/groups/${id}`),
  create: (body) => apiFetch('/groups', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => apiFetch(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/groups/${id}`, { method: 'DELETE' }),
  requestJoin: (id) => apiFetch(`/groups/${id}/join-request`, { method: 'POST' }),
  approveRequest: (groupId, requestId) => apiFetch(`/groups/${groupId}/requests/${requestId}/approve`, { method: 'POST' }),
  rejectRequest: (groupId, requestId) => apiFetch(`/groups/${groupId}/requests/${requestId}/reject`, { method: 'POST' }),
  removeMember: (groupId, memberId) => apiFetch(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' }),
  getStudentMatches: (groupId) => apiFetch(`/groups/${groupId}/student-matches`),
  sendInvitation: (groupId, invitedUserId) =>
    apiFetch(`/groups/${groupId}/invitations`, { method: 'POST', body: JSON.stringify({ invitedUserId }) })
};

export const sessionsApi = {
  upcoming: () => apiFetch('/sessions/upcoming'),
  create: (groupId, body) => apiFetch(`/groups/${groupId}/sessions`, { method: 'POST', body: JSON.stringify(body) }),
  get: (sessionId) => apiFetch(`/sessions/${sessionId}`),
  start: (sessionId) => apiFetch(`/sessions/${sessionId}/start`, { method: 'PATCH' }),
  complete: (sessionId) => apiFetch(`/sessions/${sessionId}/complete`, { method: 'PATCH' }),
  cancel: (sessionId) => apiFetch(`/sessions/${sessionId}/cancel`, { method: 'PATCH' }),
  reschedule: (sessionId, body) =>
    apiFetch(`/sessions/${sessionId}/reschedule`, { method: 'PATCH', body: JSON.stringify(body) }),
  checkIn: (sessionId) => apiFetch(`/sessions/${sessionId}/check-in`, { method: 'POST' }),
  saveAttendance: (sessionId, body) =>
    apiFetch(`/sessions/${sessionId}/attendance`, { method: 'POST', body: JSON.stringify(body) }),
  rate: (sessionId, body) =>
    apiFetch(`/sessions/${sessionId}/ratings`, { method: 'POST', body: JSON.stringify(body) })
};

export const invitationsApi = {
  getMyInvitations: () => apiFetch('/invitations'),
  respond: (invitationId, accept) =>
    apiFetch(`/invitations/${invitationId}/respond`, { method: 'PATCH', body: JSON.stringify({ accept }) })
};
