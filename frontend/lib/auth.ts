import { api } from "./api";
import type { User } from "./types";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export function storeTokens(tokens: TokenResponse) {
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}

export async function login(email: string, password: string, totpCode?: string) {
  const tokens = await api.post<TokenResponse>("/auth/login", { email, password, totp_code: totpCode });
  storeTokens(tokens);
  return tokens;
}

export async function register(email: string, password: string, fullName?: string) {
  return api.post<User>("/auth/register", { email, password, full_name: fullName });
}

export async function getCurrentUser() {
  return api.get<User>("/auth/me");
}

export function logout() {
  clearTokens();
  window.location.href = "/login";
}
