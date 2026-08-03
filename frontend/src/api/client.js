// =============================================================================
// API client
// =============================================================================
// A thin wrapper around fetch() so every call automatically:
//   1. Points at the backend (configurable via VITE_API_URL for Docker vs
//      local dev).
//   2. Attaches the JWT from localStorage, if we have one.
//   3. Throws a real Error with the server's message on non-2xx responses,
//      so components can just try/catch instead of checking res.ok everywhere.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem('pickleRickToken');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return {};

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

/**
 * Same as request(), but sends a FormData body (multipart/form-data) instead
 * of JSON - used only for the profile photo upload, which needs an actual
 * file. Deliberately skips the Content-Type header: the browser sets it
 * itself, including the multipart boundary, which we can't set by hand.
 */
async function requestFormData(path, formData) {
  const headers = {};
  const token = localStorage.getItem('pickleRickToken');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/api/auth/me'),
  updateProfile: (payload) => request('/api/auth/me', { method: 'PATCH', body: payload }),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return requestFormData('/api/auth/me/photo', formData);
  },

  listCourts: (location) => request(`/api/courts?location=${encodeURIComponent(location)}`),
  listMyCourts: () => request('/api/courts/mine'),
  createCourt: (payload) => request('/api/courts', { method: 'POST', body: payload }),
  getCourtAvailability: (courtId, date) =>
    request(`/api/courts/${courtId}/availability?date=${encodeURIComponent(date)}`),

  createBooking: (payload) => request('/api/bookings', { method: 'POST', body: payload }),
  listMyBookings: () => request('/api/bookings/mine'),
  listBookingsForCourt: (courtId, date) =>
    request(`/api/bookings/court/${courtId}?date=${encodeURIComponent(date)}`),
  approveBooking: (bookingId) => request(`/api/bookings/${bookingId}/approve`, { method: 'PATCH' }),
  cancelBooking: (bookingId) => request(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH' }),

  requestToJoin: (bookingId) => request(`/api/bookings/${bookingId}/join`, { method: 'POST' }),
  respondToJoinRequest: (joinRequestId, approve) =>
    request(`/api/bookings/join-requests/${joinRequestId}`, { method: 'PATCH', body: { approve } }),
  listIncomingJoinRequests: () => request('/api/bookings/join-requests/incoming'),
  listOutgoingJoinRequests: () => request('/api/bookings/join-requests/outgoing'),

  listItems: (courtId) => request(`/api/courts/${courtId}/items`),
  createItem: (courtId, payload) =>
    request(`/api/courts/${courtId}/items`, { method: 'POST', body: payload }),
  updateItem: (courtId, itemId, payload) =>
    request(`/api/courts/${courtId}/items/${itemId}`, { method: 'PATCH', body: payload }),
  deleteItem: (courtId, itemId) =>
    request(`/api/courts/${courtId}/items/${itemId}`, { method: 'DELETE' }),
};
