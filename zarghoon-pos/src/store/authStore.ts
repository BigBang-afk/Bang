import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  storedUsername: string;
  storedPassword: string;
  lastLoginAt: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (current: string, next: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      username: null,
      storedUsername: "admin",
      storedPassword: "zarghoon123",
      lastLoginAt: null,
      login: (username, password) => {
        const state = get();
        if (
          username.trim().toLowerCase() === state.storedUsername.toLowerCase() &&
          password === state.storedPassword
        ) {
          set({
            isAuthenticated: true,
            username: state.storedUsername,
            lastLoginAt: new Date().toISOString(),
          });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false, username: null }),
      changePassword: (current, next) => {
        const state = get();
        if (current !== state.storedPassword) return false;
        set({ storedPassword: next });
        return true;
      },
    }),
    { name: "zarghoon-auth" }
  )
);
