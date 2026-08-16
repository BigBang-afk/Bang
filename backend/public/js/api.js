// Minimal API client for the Bang Identity & Access UI.
// Access tokens are kept in memory only (never localStorage) — a page
// reload re-authenticates silently via the httpOnly refresh cookie.

const API_BASE = '/api';
let accessToken = null;
let currentUser = null;

async function rawFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

async function tryRefresh() {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    accessToken = null;
    currentUser = null;
    return false;
  }
  const data = await res.json();
  accessToken = data.accessToken;
  currentUser = data.user;
  return true;
}

async function apiFetch(path, options = {}) {
  let res = await rawFetch(path, options);
  if (res.status === 401 && !options.__retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, options);
    }
  }
  return res;
}

async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    // empty body
  }
  if (!res.ok) {
    const message = (body && (body.message || body.error)) || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return body;
}

async function login(email, password, totpCode) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  if (data.mfaRequired) {
    return { mfaRequired: true };
  }
  accessToken = data.accessToken;
  currentUser = data.user;
  return { mfaRequired: false, user: data.user };
}

async function logout() {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  accessToken = null;
  currentUser = null;
}

/** Call on every authenticated page load. Redirects to login on failure. */
async function requireAuth() {
  const ok = await tryRefresh();
  if (!ok) {
    window.location.href = '/login.html';
    return null;
  }
  return currentUser;
}

function hasPermission(code) {
  return !!currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.includes(code);
}

function getCurrentUser() {
  return currentUser;
}
