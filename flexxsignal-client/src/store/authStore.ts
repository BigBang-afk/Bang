import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  roles: string[];
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      email: null,
      displayName: null,
      roles: [],
      isAuthenticated: false,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          userId: session.userId,
          email: session.email,
          displayName: session.displayName,
          roles: session.roles,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          email: null,
          displayName: null,
          roles: [],
          isAuthenticated: false,
        }),
      hasRole: (...roles) => roles.some((r) => get().roles.includes(r)),
    }),
    { name: "flexxsignal-auth" }
  )
);

export const STAFF_ROLES = ["SuperAdmin", "Admin", "Analyst"];
export const isStaffRole = (roles: string[]) => roles.some((r) => STAFF_ROLES.includes(r));
