import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

interface UiState {
  theme: Theme;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        set({ theme: next });
      },
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: "flexxsignal-ui" }
  )
);

export interface Toast { id: string; message: string; kind: "success" | "error" | "info" }

interface ToastState {
  toasts: Toast[];
  push: (message: string, kind?: Toast["kind"]) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
