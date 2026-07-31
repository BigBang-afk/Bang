import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  selectedAssetSymbol: string;
  selectedStrategyCode: string | null;
  aiAutoEnabled: boolean;
  selectedTimeframe: string;
  selectedExpirySeconds: number;
  soundEnabled: boolean;
  setSelectedAsset: (symbol: string) => void;
  setSelectedStrategy: (code: string | null) => void;
  setAiAutoEnabled: (enabled: boolean) => void;
  setSelectedTimeframe: (tf: string) => void;
  setSelectedExpirySeconds: (seconds: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      selectedAssetSymbol: "EUR/USD",
      selectedStrategyCode: "ema_trend_pullback",
      aiAutoEnabled: false,
      selectedTimeframe: "1m",
      selectedExpirySeconds: 60,
      soundEnabled: true,
      setSelectedAsset: (symbol) => set({ selectedAssetSymbol: symbol }),
      setSelectedStrategy: (code) => set({ selectedStrategyCode: code }),
      setAiAutoEnabled: (enabled) => set({ aiAutoEnabled: enabled }),
      setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
      setSelectedExpirySeconds: (seconds) => set({ selectedExpirySeconds: seconds }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    { name: "quotex-preferences" }
  )
);
