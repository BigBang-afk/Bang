import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

// Nullish coalescing (not ||) deliberately: an explicitly empty string means "same origin,
// relative paths" (the production Docker build), which must not fall back to the dev default.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5080";

export const apiClient: AxiosInstance = axios.create({ baseURL });

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${baseURL}/api/auth/refresh`, { refreshToken })
          .then((res) => {
            useAuthStore.getState().setSession(res.data);
            return res.data.accessToken as string;
          })
          .catch(() => {
            useAuthStore.getState().logout();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  const anyErr = err as any;
  const errors = anyErr?.response?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.join(" ");
  return anyErr?.response?.data?.error || anyErr?.message || "Something went wrong.";
}
