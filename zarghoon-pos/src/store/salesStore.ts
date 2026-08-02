import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Karat } from "./goldRateStore";

export interface SaleLineItem {
  productId: string;
  name: string;
  sku: string;
  karat: Karat;
  weightGrams: number;
  qty: number;
  ratePerGram: number;
  makingCharge: number;
  stoneCharge: number;
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

interface SalesState {
  sales: Sale[];
  nextInvoiceSeq: number;
  addSale: (sale: Omit<Sale, "id" | "date" | "invoiceNo">) => Sale;
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
    }),
    { name: "zarghoon-sales" }
  )
);
