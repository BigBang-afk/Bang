import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "./inventoryStore";

export type OldGoldStatus = "Pending" | "Melted" | "Returned";

export interface OldGoldEntry {
  id: string;
  voucherNo: string;
  category: Category;
  quality: string;
  netWeightGrams: number;
  kaat: number;
  goldRate: number;
  buyPriceCash: number;
  buyPriceGold: number;
  estimatePureGrams: number;
  customerName: string;
  customerPhone: string;
  status: OldGoldStatus;
  createdAt: string;
  actualPureGrams?: number;
  meltVarianceGrams?: number;
  closedAt?: string;
}

export type OldGoldFormInput = Pick<
  OldGoldEntry,
  "category" | "quality" | "netWeightGrams" | "kaat" | "goldRate" | "customerName" | "customerPhone"
>;

export function computeOldGold(netWeightGrams: number, kaat: number, goldRate: number) {
  const buyPriceCash = netWeightGrams * kaat * goldRate;
  const estimatePureGrams = goldRate > 0 ? buyPriceCash / goldRate : 0;
  const buyPriceGold = estimatePureGrams;
  return { buyPriceCash, estimatePureGrams, buyPriceGold };
}

interface OldGoldState {
  entries: OldGoldEntry[];
  nextVoucherSeq: number;
  addEntry: (input: OldGoldFormInput) => void;
  updateEntry: (id: string, patch: Partial<OldGoldFormInput>) => void;
  removeEntry: (id: string) => void;
  meltEntry: (id: string, actualPureGrams: number) => void;
  returnEntry: (id: string) => void;
}

export const useOldGoldStore = create<OldGoldState>()(
  persist(
    (set, get) => ({
      entries: [],
      nextVoucherSeq: 501,
      addEntry: (input) => {
        const seq = get().nextVoucherSeq;
        const calc = computeOldGold(input.netWeightGrams, input.kaat, input.goldRate);
        const entry: OldGoldEntry = {
          ...input,
          ...calc,
          id: crypto.randomUUID(),
          voucherNo: `OG-${seq}`,
          status: "Pending",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          entries: [entry, ...state.entries],
          nextVoucherSeq: state.nextVoucherSeq + 1,
        }));
      },
      updateEntry: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((e) => {
            if (e.id !== id || e.status !== "Pending") return e;
            const merged = { ...e, ...patch };
            const calc = computeOldGold(merged.netWeightGrams, merged.kaat, merged.goldRate);
            return { ...merged, ...calc };
          }),
        })),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      meltEntry: (id, actualPureGrams) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id && e.status === "Pending"
              ? {
                  ...e,
                  status: "Melted" as const,
                  actualPureGrams,
                  meltVarianceGrams: actualPureGrams - e.estimatePureGrams,
                  closedAt: new Date().toISOString(),
                }
              : e
          ),
        })),
      returnEntry: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id && e.status === "Pending"
              ? { ...e, status: "Returned" as const, closedAt: new Date().toISOString() }
              : e
          ),
        })),
    }),
    { name: "zarghoon-old-gold" }
  )
);
