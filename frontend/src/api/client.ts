// Minimal, dependency-free API client for the Zarghoon Identity & Access UI.
//
// Security notes:
// - The access token lives only in memory (a module-level variable), never
//   in localStorage/sessionStorage — an XSS bug can't exfiltrate it from
//   storage if it was never put there.
// - A page reload loses that in-memory token by design; app startup calls
//   /auth/refresh (which relies on the httpOnly refresh cookie) to get a
//   fresh one silently.
// - The refresh cookie is httpOnly (no JS access) and is paired with a
//   separate, JS-readable CSRF cookie; state-changing calls that rely on
//   the ambient cookie (refresh, logout) echo it back as a header.

import type { AppUser } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

let accessToken: string | null = null;
let csrfToken: string | null = null;
let currentUser: AppUser | null = null;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function buildHeaders(body?: unknown, extraCsrf = false): Headers {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (extraCsrf && csrfToken) headers.set('X-CSRF-Token', csrfToken);
  return headers;
}

async function rawRequest(
  path: string,
  options: { method?: string; body?: unknown; csrf?: boolean } = {},
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options.body, options.csrf),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });
}

interface LoginResult {
  accessToken: string;
  user: AppUser;
  csrfToken: string;
}

function applySession(result: LoginResult) {
  accessToken = result.accessToken;
  csrfToken = result.csrfToken;
  currentUser = result.user;
}

function clearSession() {
  accessToken = null;
  csrfToken = null;
  currentUser = null;
}

export async function login(
  identifier: string,
  password: string,
  totpCode?: string,
): Promise<{ mfaRequired: true } | { mfaRequired: false; user: AppUser }> {
  const res = await rawRequest('/auth/login', {
    method: 'POST',
    body: { identifier, password, totpCode: totpCode || undefined },
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.message ?? 'Login failed', res.status);
  if (data.mfaRequired) return { mfaRequired: true };
  applySession(data);
  return { mfaRequired: false, user: data.user };
}

export async function refreshSession(): Promise<AppUser | null> {
  const res = await rawRequest('/auth/refresh', { method: 'POST', csrf: true });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const data = await res.json();
  applySession(data);
  return data.user;
}

export async function logout(): Promise<void> {
  await rawRequest('/auth/logout', { method: 'POST', csrf: true });
  clearSession();
}

export function getCurrentUser(): AppUser | null {
  return currentUser;
}

export function hasPermission(code: string): boolean {
  return !!currentUser?.permissions?.includes(code);
}

/** Authenticated JSON request with a single automatic silent-refresh retry on 401. */
export async function apiJson<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res = await rawRequest(path, options);
  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await rawRequest(path, options);
    }
  }
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const body = payload as { message?: string | string[] } | null;
    const message = body?.message;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : (message ?? `Request failed (${res.status})`),
      res.status,
    );
  }
  return payload as T;
}
