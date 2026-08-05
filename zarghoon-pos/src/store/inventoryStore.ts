import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Category = string;

export const defaultCategories: Category[] = [
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

const CATEGORY_CODE: Record<string, string> = {
  Ring: "RG",
  Necklace: "NK",
  Bangle: "BN",
  Earrings: "ER",
  Chain: "CH",
  Bracelet: "BR",
  Set: "ST",
  Pendant: "PD",
  Other: "OT",
};

function categoryCode(category: string): string {
  if (CATEGORY_CODE[category]) return CATEGORY_CODE[category];
  const letters = category.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 2) || "XX").padEnd(2, "X");
}

// Traditional 96-point gold purity scale used for stock costing.
export const GOLD_BASE = 96;

export function computeGrossWeight(netWeightGrams: number, wastagePercent: number): number {
  return netWeightGrams + (netWeightGrams * wastagePercent) / 100;
}

export function computeBuyPriceInGold(netWeightGrams: number, kaat: number): number {
  return (netWeightGrams / GOLD_BASE) * kaat;
}

function generateSku(category: Category, existingSkus: string[]): string {
  const code = categoryCode(category);
  const used = new Set(existingSkus);
  let sku: string;
  do {
    const num = Math.floor(100 + Math.random() * 900);
    sku = `ZJ-${code}-${num}`;
  } while (used.has(sku));
  return sku;
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

// Fields the Add/Edit Stock form actually collects. SKU is generated and
// stock always starts at 1 (each entry represents one physical piece).
export type ProductFormInput = Pick<
  Product,
  "name" | "category" | "netWeightGrams" | "wastagePercent" | "kaat" | "images"
>;

type FullProductInput = ProductFormInput & { sku: string; stock: number };

function withDerivedFields(input: FullProductInput): Omit<Product, "id" | "createdAt"> {
  return {
    ...input,
    grossWeightGrams: computeGrossWeight(input.netWeightGrams, input.wastagePercent),
    buyPriceInGold: computeBuyPriceInGold(input.netWeightGrams, input.kaat),
  };
}

interface InventoryState {
  products: Product[];
  categories: Category[];
  addProduct: (p: ProductFormInput) => void;
  updateProduct: (id: string, patch: Partial<ProductFormInput>) => void;
  removeProduct: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  addCategory: (name: string) => string;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: [],
      categories: defaultCategories,
      addCategory: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return "";
        const existing = get().categories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing;
        set((state) => ({ categories: [...state.categories, trimmed] }));
        return trimmed;
      },
      addProduct: (p) =>
        set((state) => {
          const sku = generateSku(
            p.category,
            state.products.map((x) => x.sku)
          );
          const full: FullProductInput = { ...p, sku, stock: 1 };
          return {
            products: [
              ...state.products,
              { ...withDerivedFields(full), id: crypto.randomUUID(), createdAt: new Date().toISOString() },
            ],
          };
        }),
      updateProduct: (id, patch) =>
        set((state) => ({
          products: state.products.map((existing) => {
            if (existing.id !== id) return existing;
            const merged: FullProductInput = {
              sku: existing.sku,
              stock: existing.stock,
              name: patch.name ?? existing.name,
              category: patch.category ?? existing.category,
              netWeightGrams: patch.netWeightGrams ?? existing.netWeightGrams,
              wastagePercent: patch.wastagePercent ?? existing.wastagePercent,
              kaat: patch.kaat ?? existing.kaat,
              images: patch.images ?? existing.images,
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
