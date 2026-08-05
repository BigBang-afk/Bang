import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Timeframe } from "@/types";

interface SettingsState {
  selectedSymbol: string;
  timeframe: Timeframe;
  soundAlertsEnabled: boolean;
  setSelectedSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  toggleSoundAlerts: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedSymbol: "BTCUSDT",
      timeframe: "15m",
      soundAlertsEnabled: true,
      setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      toggleSoundAlerts: () => set((s) => ({ soundAlertsEnabled: !s.soundAlertsEnabled })),
    }),
    { name: "bang-settings" }
  )
);
