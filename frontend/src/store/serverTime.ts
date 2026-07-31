import { create } from "zustand";

interface ServerTimeState {
  offsetMs: number;
  synced: boolean;
  setServerTime: (serverTimeIso: string) => void;
  getServerNow: () => number;
}

/** Tracks the offset between server time and the local browser clock so the
 * countdown timer stays accurate across refreshes and reconnections without
 * ever trusting the browser clock alone. */
export const useServerTimeStore = create<ServerTimeState>((set, get) => ({
  offsetMs: 0,
  synced: false,
  setServerTime: (serverTimeIso: string) => {
    const serverMs = new Date(serverTimeIso).getTime();
    const localMs = Date.now();
    set({ offsetMs: serverMs - localMs, synced: true });
  },
  getServerNow: () => Date.now() + get().offsetMs,
}));
