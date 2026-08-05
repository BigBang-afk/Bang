import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayKey } from "../lib/format";

export type CashEntryType = "In" | "Out";

export interface CashEntry {
  id: string;
  date: string;
  type: CashEntryType;
  amount: number;
  reason: string;
  createdAt: string;
}

export type CashEntryInput = Pick<CashEntry, "type" | "amount" | "reason">;

export interface DayClosing {
  date: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  closedAt: string;
}

interface CashBookState {
  entries: CashEntry[];
  closings: DayClosing[];
  addEntry: (date: string, input: CashEntryInput) => void;
  updateEntry: (id: string, patch: Partial<CashEntryInput>) => void;
  removeEntry: (id: string) => void;
  closeDay: (date: string, openingBalance: number, totalIn: number, totalOut: number) => void;
  reopenDay: (date: string) => void;
}

export const useCashBookStore = create<CashBookState>()(
  persist(
    (set) => ({
      entries: [],
      closings: [],
      addEntry: (date, input) =>
        set((state) => ({
          entries: [
            {
              id: crypto.randomUUID(),
              date,
              ...input,
              createdAt: new Date().toISOString(),
            },
            ...state.entries,
          ],
        })),
      updateEntry: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      closeDay: (date, openingBalance, totalIn, totalOut) =>
        set((state) => ({
          closings: [
            ...state.closings.filter((c) => c.date !== date),
            {
              date,
              openingBalance,
              totalIn,
              totalOut,
              closingBalance: openingBalance + totalIn - totalOut,
              closedAt: new Date().toISOString(),
            },
          ],
        })),
      reopenDay: (date) =>
        set((state) => ({ closings: state.closings.filter((c) => c.date !== date) })),
    }),
    { name: "zarghoon-cash-book" }
  )
);

export function isDayClosed(closings: DayClosing[], date: string): boolean {
  return closings.some((c) => c.date === date);
}

export function openingBalanceForDate(closings: DayClosing[], date: string): number {
  const prior = closings
    .filter((c) => c.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return prior.length > 0 ? prior[0].closingBalance : 0;
}

export function defaultDate(): string {
  return todayKey();
}
