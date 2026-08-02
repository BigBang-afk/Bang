import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayKey } from "../lib/format";

export type Karat = 18 | 21 | 22 | 24;

export interface RateHistoryEntry {
  date: string;
  k21: number;
  k18: number;
  k22: number;
  k24: number;
}

interface GoldRateState {
  k21: number;
  k18: number;
  k22: number;
  k24: number;
  updatedAt: string | null;
  lastPromptDate: string | null;
  history: RateHistoryEntry[];
  needsDailyPrompt: () => boolean;
  setK21Rate: (value: number, autoDerive: boolean) => void;
  setAllRates: (rates: { k18: number; k21: number; k22: number; k24: number }) => void;
  acknowledgeDailyPrompt: () => void;
}

// purity fractions relative to 24K pure gold
const PURITY: Record<Karat, number> = {
  24: 1,
  22: 22 / 24,
  21: 21 / 24,
  18: 18 / 24,
};

function deriveFromK21(k21: number) {
  const k24 = k21 / PURITY[21];
  return {
    k21,
    k24: Math.round(k24),
    k22: Math.round(k24 * PURITY[22]),
    k18: Math.round(k24 * PURITY[18]),
  };
}

export const useGoldRateStore = create<GoldRateState>()(
  persist(
    (set, get) => ({
      k21: 0,
      k18: 0,
      k22: 0,
      k24: 0,
      updatedAt: null,
      lastPromptDate: null,
      history: [],

      needsDailyPrompt: () => {
        const state = get();
        return state.lastPromptDate !== todayKey() || state.k21 <= 0;
      },

      setK21Rate: (value, autoDerive) => {
        const state = get();
        const rates = autoDerive
          ? deriveFromK21(value)
          : { k21: value, k18: state.k18, k22: state.k22, k24: state.k24 };
        const today = todayKey();
        const history = [...state.history];
        const existingIdx = history.findIndex((h) => h.date === today);
        const entry: RateHistoryEntry = {
          date: today,
          k21: rates.k21,
          k18: rates.k18,
          k22: rates.k22,
          k24: rates.k24,
        };
        if (existingIdx >= 0) history[existingIdx] = entry;
        else history.push(entry);

        set({
          k21: rates.k21,
          k18: rates.k18,
          k22: rates.k22,
          k24: rates.k24,
          updatedAt: new Date().toISOString(),
          lastPromptDate: today,
          history: history.slice(-90),
        });
      },

      setAllRates: (rates) => {
        const today = todayKey();
        const history = [...get().history];
        const existingIdx = history.findIndex((h) => h.date === today);
        const entry: RateHistoryEntry = { date: today, ...rates };
        if (existingIdx >= 0) history[existingIdx] = entry;
        else history.push(entry);

        set({
          ...rates,
          updatedAt: new Date().toISOString(),
          lastPromptDate: today,
          history: history.slice(-90),
        });
      },

      acknowledgeDailyPrompt: () => set({ lastPromptDate: todayKey() }),
    }),
    { name: "zarghoon-gold-rates" }
  )
);

export function rateForKarat(
  rates: { k18: number; k21: number; k22: number; k24: number },
  karat: Karat
): number {
  switch (karat) {
    case 18:
      return rates.k18;
    case 21:
      return rates.k21;
    case 22:
      return rates.k22;
    case 24:
      return rates.k24;
  }
}
