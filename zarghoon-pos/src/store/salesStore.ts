import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "./inventoryStore";

export interface SaleLineItem {
  productId: string;
  name: string;
  sku: string;
  category: Category;
  netWeightGrams: number;
  grossWeightGrams: number;
  kaat: number;
  buyPriceInGold: number;
  qty: number;
  ratePerGram: number;
  lineTotal: number;
}

export type PaymentMethod = "Cash" | "Card" | "Bank Transfer";

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: SaleLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export type SaleEditableFields = Pick<Sale, "customerName" | "customerPhone" | "paymentMethod" | "discount">;

interface SalesState {
  sales: Sale[];
  nextInvoiceSeq: number;
  addSale: (sale: Omit<Sale, "id" | "date" | "invoiceNo">) => Sale;
  updateSale: (id: string, patch: Partial<SaleEditableFields>) => void;
  updateSaleGoldRate: (id: string, ratePerGram: number) => void;
  removeSale: (id: string) => void;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      sales: [],
      nextInvoiceSeq: 1001,
      addSale: (sale) => {
        const seq = get().nextInvoiceSeq;
        const newSale: Sale = {
          ...sale,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          invoiceNo: `ZJ-${seq}`,
        };
        set((state) => ({
          sales: [newSale, ...state.sales],
          nextInvoiceSeq: state.nextInvoiceSeq + 1,
        }));
        return newSale;
      },
      updateSale: (id, patch) =>
        set((state) => ({
          sales: state.sales.map((s) => {
            if (s.id !== id) return s;
            const discount = patch.discount ?? s.discount;
            return {
              ...s,
              ...patch,
              discount,
              total: Math.max(0, s.subtotal - discount),
            };
          }),
        })),
      updateSaleGoldRate: (id, ratePerGram) =>
        set((state) => ({
          sales: state.sales.map((s) =>
            s.id === id
              ? { ...s, items: s.items.map((it) => ({ ...it, ratePerGram })) }
              : s
          ),
        })),
      removeSale: (id) => set((state) => ({ sales: state.sales.filter((s) => s.id !== id) })),
    }),
    { name: "zarghoon-sales" }
  )
);
