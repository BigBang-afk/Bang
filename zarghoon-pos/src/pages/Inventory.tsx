import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import {
  useInventoryStore,
  type Product,
  type Category,
} from "../store/inventoryStore";
import { useGoldRateStore, type Karat } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { computeProductPrice } from "../lib/pricing";
import { formatMoney } from "../lib/format";

const categories: Category[] = [
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
const karats: Karat[] = [18, 21, 22, 24];
const icons = ["💍", "📿", "⭕", "✨", "⛓️", "🔶", "👑", "💎"];

type FormState = Omit<Product, "id" | "createdAt">;

const emptyForm: FormState = {
  sku: "",
  name: "",
  category: "Ring",
  karat: 21,
  weightGrams: 0,
  makingChargePerGram: 0,
  stoneCharge: 0,
  stock: 0,
  icon: "💍",
};

export default function Inventory() {
  const products = useInventoryStore((s) => s.products);
  const addProduct = useInventoryStore((s) => s.addProduct);
  const updateProduct = useInventoryStore((s) => s.updateProduct);
  const removeProduct = useInventoryStore((s) => s.removeProduct);
  const rates = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setShowForm(true);
  }

  function handleSubmit(form: FormState) {
    if (editing) {
      updateProduct(editing.id, form);
    } else {
      addProduct(form);
    }
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">Inventory</h1>
          <p className="text-sm text-ink-500">{products.length} products in catalogue</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 hover:from-gold-500 hover:to-gold-400"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-gold-900/50 bg-ink-900/50 px-3 sm:max-w-sm">
        <Search size={16} className="text-ink-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full bg-transparent py-2.5 text-sm text-[#ece6d9] outline-none placeholder:text-ink-600"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gold-900/25 bg-ink-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-900/30 text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Karat</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const { total } = computeProductPrice(p, rates);
              return (
                <tr key={p.id} className="border-b border-gold-900/10 last:border-0 hover:bg-ink-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{p.icon}</span>
                      <div>
                        <div className="font-medium text-[#ece6d9]">{p.name}</div>
                        <div className="text-[11px] text-ink-500">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{p.category}</td>
                  <td className="px-4 py-3 text-ink-500">{p.karat}K</td>
                  <td className="px-4 py-3 text-ink-500">{p.weightGrams} g</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.stock <= 0
                          ? "bg-rose-500/10 text-rose-400"
                          : p.stock <= 5
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gold-300">
                    {formatMoney(total, currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-gold-300"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-rose-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProductFormModal
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="animate-rise w-full max-w-sm rounded-2xl border border-gold-900/40 bg-ink-950 p-6">
            <h3 className="font-serif text-lg font-semibold text-gold-100">Delete Product</h3>
            <p className="mt-2 text-sm text-ink-500">
              Are you sure you want to remove <span className="text-[#c9bd9e]">{confirmDelete.name}</span> from
              inventory? This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg border border-gold-900/50 py-2 text-sm text-[#c9bd9e] hover:border-gold-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeProduct(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="flex-1 rounded-lg bg-rose-600/90 py-2 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductFormModal({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Product | null;
  onCancel: () => void;
  onSubmit: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          sku: initial.sku,
          name: initial.name,
          category: initial.category,
          karat: initial.karat,
          weightGrams: initial.weightGrams,
          makingChargePerGram: initial.makingChargePerGram,
          stoneCharge: initial.stoneCharge,
          stock: initial.stock,
          icon: initial.icon,
        }
      : emptyForm
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) return;
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-gold-100">
            {initial ? "Edit Product" : "Add Product"}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-2">
            {icons.map((ic) => (
              <button
                type="button"
                key={ic}
                onClick={() => update("icon", ic)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition ${
                  form.icon === ic
                    ? "border-gold-500 bg-gold-500/15"
                    : "border-gold-900/40 hover:border-gold-700"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Product Name" span2>
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="SKU">
              <input
                required
                value={form.sku}
                onChange={(e) => update("sku", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value as Category)}
                className="input"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Karat">
              <select
                value={form.karat}
                onChange={(e) => update("karat", Number(e.target.value) as Karat)}
                className="input"
              >
                {karats.map((k) => (
                  <option key={k} value={k}>
                    {k}K
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weight (grams)">
              <input
                type="number"
                min={0}
                step={0.01}
                required
                value={form.weightGrams || ""}
                onChange={(e) => update("weightGrams", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Making Charge / gram">
              <input
                type="number"
                min={0}
                value={form.makingChargePerGram || ""}
                onChange={(e) => update("makingChargePerGram", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Stone / Extra Charge">
              <input
                type="number"
                min={0}
                value={form.stoneCharge || ""}
                onChange={(e) => update("stoneCharge", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Stock Quantity">
              <input
                type="number"
                min={0}
                value={form.stock || ""}
                onChange={(e) => update("stock", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gold-900/40 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gold-900/50 py-2.5 text-sm text-[#c9bd9e] hover:border-gold-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
          >
            {initial ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <label className={`block ${span2 ? "col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
        {label}
      </span>
      {children}
    </label>
  );
}
