import { create } from "zustand";
import { persist } from "zustand/middleware";
import { digitsOnly } from "../lib/whatsapp";

export type CustomerSource = "manual" | "sale";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  notes: string;
  source: CustomerSource;
  createdAt: string;
}

export type CustomerFormInput = Pick<Customer, "name" | "phone" | "tags" | "notes">;

interface CustomerState {
  customers: Customer[];
  addCustomer: (input: CustomerFormInput) => void;
  updateCustomer: (id: string, patch: Partial<CustomerFormInput>) => void;
  removeCustomer: (id: string) => void;
  importFromSales: (sales: { customerName: string; customerPhone: string }[]) => number;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      addCustomer: (input) =>
        set((state) => ({
          customers: [
            {
              id: crypto.randomUUID(),
              ...input,
              source: "manual",
              createdAt: new Date().toISOString(),
            },
            ...state.customers,
          ],
        })),
      updateCustomer: (id, patch) =>
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCustomer: (id) =>
        set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),
      importFromSales: (sales) => {
        const existingPhones = new Set(get().customers.map((c) => digitsOnly(c.phone)));
        const seen = new Set<string>();
        const toAdd: Customer[] = [];
        for (const s of sales) {
          const phone = digitsOnly(s.customerPhone);
          if (!phone || existingPhones.has(phone) || seen.has(phone)) continue;
          seen.add(phone);
          toAdd.push({
            id: crypto.randomUUID(),
            name: s.customerName || "Walk-in Customer",
            phone: s.customerPhone,
            tags: ["From Sale"],
            notes: "",
            source: "sale",
            createdAt: new Date().toISOString(),
          });
        }
        if (toAdd.length > 0) {
          set((state) => ({ customers: [...toAdd, ...state.customers] }));
        }
        return toAdd.length;
      },
    }),
    { name: "zarghoon-customers" }
  )
);
