import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RiskProfileConfig, TradingMode } from "./types";

interface SessionState {
  tradingMode: TradingMode | null;
  riskConfig: RiskProfileConfig | null;
  setTradingMode: (mode: TradingMode) => void;
  setRiskConfig: (config: RiskProfileConfig) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      tradingMode: null,
      riskConfig: null,
      setTradingMode: (mode) => set({ tradingMode: mode }),
      setRiskConfig: (config) => set({ riskConfig: config }),
      reset: () => set({ tradingMode: null, riskConfig: null }),
    }),
    { name: "aurum-trading-session" }
  )
);
