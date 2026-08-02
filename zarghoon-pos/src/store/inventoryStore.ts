import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const categories: Category[] = [
  "Ring",
  "Necklace",
  "Bangle",
  "Earrings",
  "Chain",
  "Bracelet",
  "Set",
  "Pendant",
  "Other",
];

// Traditional 96-point gold purity scale used for stock costing.
export const GOLD_BASE = 96;

export function computeGrossWeight(netWeightGrams: number, wastagePercent: number): number {
  return netWeightGrams + (netWeightGrams * wastagePercent) / 100;
}

export function computeBuyPriceInGold(kaat: number): number {
  const denominator = GOLD_BASE - kaat;
  if (denominator <= 0) return 0;
  return GOLD_BASE / denominator;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Category;
  netWeightGrams: number;
  wastagePercent: number;
  grossWeightGrams: number;
  kaat: number;
  buyPriceInGold: number;
  images: string[];
  stock: number;
  createdAt: string;
}

export type ProductInput = Omit<
  Product,
  "id" | "createdAt" | "grossWeightGrams" | "buyPriceInGold"
>;

function withDerivedFields(input: ProductInput): Omit<Product, "id" | "createdAt"> {
  return {
    ...input,
    grossWeightGrams: computeGrossWeight(input.netWeightGrams, input.wastagePercent),
    buyPriceInGold: computeBuyPriceInGold(input.kaat),
  };
}

interface InventoryState {
  products: Product[];
  addProduct: (p: ProductInput) => void;
  updateProduct: (id: string, patch: Partial<ProductInput>) => void;
  removeProduct: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
}

function seedProduct(input: ProductInput, id: string, daysAgo: number): Product {
  return {
    ...withDerivedFields(input),
    id,
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  };
}

const seedProducts: Product[] = [
  seedProduct(
    {
      sku: "ZJ-RG-101",
      name: "Bridal Kundan Ring",
      category: "Ring",
      netWeightGrams: 6.2,
      wastagePercent: 6,
      kaat: 8,
      images: [],
      stock: 8,
    },
    "p1",
    12
  ),
  seedProduct(
    {
      sku: "ZJ-NK-204",
      name: "Rani Haar Necklace Set",
      category: "Set",
      netWeightGrams: 42.5,
      wastagePercent: 8,
      kaat: 12,
      images: [],
      stock: 3,
    },
    "p2",
    10
  ),
  seedProduct(
    {
      sku: "ZJ-BN-330",
      name: "Classic Gold Bangle (Pair)",
      category: "Bangle",
      netWeightGrams: 24.8,
      wastagePercent: 5,
      kaat: 8,
      images: [],
      stock: 12,
    },
    "p3",
    8
  ),
  seedProduct(
    {
      sku: "ZJ-ER-045",
      name: "Jhumka Earrings",
      category: "Earrings",
      netWeightGrams: 8.4,
      wastagePercent: 7,
      kaat: 8,
      images: [],
      stock: 15,
    },
    "p4",
    6
  ),
  seedProduct(
    {
      sku: "ZJ-CH-512",
      name: 'Rope Chain 22"',
      category: "Chain",
      netWeightGrams: 18.6,
      wastagePercent: 4,
      kaat: 4,
      images: [],
      stock: 20,
    },
    "p5",
    4
  ),
  seedProduct(
    {
      sku: "ZJ-PD-089",
      name: "Filigree Pendant",
      category: "Pendant",
      netWeightGrams: 4.1,
      wastagePercent: 9,
      kaat: 16,
      images: [],
      stock: 10,
    },
    "p6",
    2
  ),
];

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      products: seedProducts,
      addProduct: (p) =>
        set((state) => ({
          products: [
            ...state.products,
            { ...withDerivedFields(p), id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),
      updateProduct: (id, patch) =>
        set((state) => ({
          products: state.products.map((existing) => {
            if (existing.id !== id) return existing;
            const merged: ProductInput = {
              sku: patch.sku ?? existing.sku,
              name: patch.name ?? existing.name,
              category: patch.category ?? existing.category,
              netWeightGrams: patch.netWeightGrams ?? existing.netWeightGrams,
              wastagePercent: patch.wastagePercent ?? existing.wastagePercent,
              kaat: patch.kaat ?? existing.kaat,
              images: patch.images ?? existing.images,
              stock: patch.stock ?? existing.stock,
            };
            return { ...existing, ...withDerivedFields(merged) };
          }),
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
