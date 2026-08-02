import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Karat } from "./goldRateStore";

export type Category =
  | "Ring"
  | "Necklace"
  | "Bangle"
  | "Earrings"
  | "Chain"
  | "Bracelet"
  | "Set"
  | "Pendant"
  | "Other";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Category;
  karat: Karat;
  weightGrams: number;
  makingChargePerGram: number;
  stoneCharge: number;
  stock: number;
  icon: string;
  createdAt: string;
}

interface InventoryState {
  products: Product[];
  addProduct: (p: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
}

const seedProducts: Product[] = [
  {
    id: "p1",
    sku: "ZJ-RG-101",
    name: "Bridal Kundan Ring",
    category: "Ring",
    karat: 21,
    weightGrams: 6.2,
    makingChargePerGram: 800,
    stoneCharge: 1500,
    stock: 8,
    icon: "💍",
    createdAt: new Date().toISOString(),
  },
  {
    id: "p2",
    sku: "ZJ-NK-204",
    name: "Rani Haar Necklace Set",
    category: "Set",
    karat: 22,
    weightGrams: 42.5,
    makingChargePerGram: 950,
    stoneCharge: 12000,
    stock: 3,
    icon: "📿",
    createdAt: new Date().toISOString(),
  },
  {
    id: "p3",
    sku: "ZJ-BN-330",
    name: "Classic Gold Bangle (Pair)",
    category: "Bangle",
    karat: 21,
    weightGrams: 24.8,
    makingChargePerGram: 700,
    stoneCharge: 0,
    stock: 12,
    icon: "⭕",
    createdAt: new Date().toISOString(),
  },
  {
    id: "p4",
    sku: "ZJ-ER-045",
    name: "Jhumka Earrings",
    category: "Earrings",
    karat: 21,
    weightGrams: 8.4,
    makingChargePerGram: 900,
    stoneCharge: 800,
    stock: 15,
    icon: "✨",
    createdAt: new Date().toISOString(),
  },
  {
    id: "p5",
    sku: "ZJ-CH-512",
    name: "Rope Chain 22\"",
    category: "Chain",
    karat: 22,
    weightGrams: 18.6,
    makingChargePerGram: 650,
    stoneCharge: 0,
    stock: 20,
    icon: "⛓️",
    createdAt: new Date().toISOString(),
  },
  {
    id: "p6",
    sku: "ZJ-PD-089",
    name: "Filigree Pendant",
    category: "Pendant",
    karat: 18,
    weightGrams: 4.1,
    makingChargePerGram: 1100,
    stoneCharge: 2200,
    stock: 10,
    icon: "🔶",
    createdAt: new Date().toISOString(),
  },
];

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      products: seedProducts,
      addProduct: (p) =>
        set((state) => ({
          products: [
            ...state.products,
            { ...p, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),
      updateProduct: (id, patch) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
      adjustStock: (id, delta) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
          ),
        })),
    }),
    { name: "zarghoon-inventory" }
  )
);
