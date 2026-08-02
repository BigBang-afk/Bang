import { useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, Scale, Coins, ImagePlus } from "lucide-react";
import {
  useInventoryStore,
  categories as allCategories,
  computeGrossWeight,
  computeBuyPriceInGold,
  type Product,
  type Category,
  type ProductInput,
} from "../store/inventoryStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { computeProductPrice } from "../lib/pricing";
import { formatMoney } from "../lib/format";
import { fileToResizedDataUrl } from "../lib/image";
import ProductThumb from "../components/ProductThumb";
import StatCard from "../components/StatCard";

const categoryTabs: (Category | "All")[] = ["All", ...allCategories];

const emptyForm: ProductInput = {
  sku: "",
  name: "",
  category: "Ring",
  netWeightGrams: 0,
  wastagePercent: 0,
  kaat: 0,
  images: [],
  stock: 0,
};

export default function Inventory() {
  const products = useInventoryStore((s) => s.products);
  const addProduct = useInventoryStore((s) => s.addProduct);
  const updateProduct = useInventoryStore((s) => s.updateProduct);
  const removeProduct = useInventoryStore((s) => s.removeProduct);
  const rates = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesCategory = category === "All" || p.category === category;
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [products, category, search]
  );

  const totalNetWeight = filtered.reduce((sum, p) => sum + p.netWeightGrams * p.stock, 0);
  const totalBuyPriceInGold = filtered.reduce(
    (sum, p) => sum + p.buyPriceInGold * p.netWeightGrams * p.stock,
    0
  );

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setShowForm(true);
  }

  function handleSubmit(form: ProductInput) {
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
          <Plus size={16} /> Add Stock
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          label="Products Shown"
          value={String(filtered.length)}
          icon={Scale}
          hint={category === "All" ? "All categories" : category}
        />
        <StatCard
          label="Total Net Weight"
          value={`${totalNetWeight.toFixed(2)} g`}
          icon={Scale}
          accent
          hint="Sum of net weight × stock"
        />
        <StatCard
          label="Total Buy Price in Gold"
          value={`${totalBuyPriceInGold.toFixed(2)} g`}
          icon={Coins}
          accent
          hint="Pure-gold equivalent × stock"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-gold-900/50 bg-ink-900/50 px-3 sm:max-w-sm">
          <Search size={16} className="text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-transparent py-2.5 text-sm text-[#ece6d9] outline-none placeholder:text-ink-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                category === c
                  ? "border-gold-600 bg-gold-500/15 text-gold-300"
                  : "border-gold-900/40 text-ink-500 hover:border-gold-800 hover:text-gold-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gold-900/25 bg-ink-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-900/30 text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Net Wt</th>
              <th className="px-4 py-3 font-medium">Wastage</th>
              <th className="px-4 py-3 font-medium">Gross Wt</th>
              <th className="px-4 py-3 font-medium">Kaat</th>
              <th className="px-4 py-3 font-medium">Buy Price in Gold</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Value</th>
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
                      <ProductThumb images={p.images} size={36} />
                      <div>
                        <div className="font-medium text-[#ece6d9]">{p.name}</div>
                        <div className="text-[11px] text-ink-500">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{p.category}</td>
                  <td className="px-4 py-3 text-ink-500">{p.netWeightGrams} g</td>
                  <td className="px-4 py-3 text-ink-500">{p.wastagePercent}%</td>
                  <td className="px-4 py-3 text-ink-500">{p.grossWeightGrams.toFixed(2)} g</td>
                  <td className="px-4 py-3 text-ink-500">{p.kaat}</td>
                  <td className="px-4 py-3 text-gold-300 font-medium">{p.buyPriceInGold.toFixed(4)}</td>
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
                <td colSpan={10} className="px-4 py-10 text-center text-ink-500">
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
  onSubmit: (form: ProductInput) => void;
}) {
  const [form, setForm] = useState<ProductInput>(
    initial
      ? {
          sku: initial.sku,
          name: initial.name,
          category: initial.category,
          netWeightGrams: initial.netWeightGrams,
          wastagePercent: initial.wastagePercent,
          kaat: initial.kaat,
          images: initial.images,
          stock: initial.stock,
        }
      : emptyForm
  );
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grossWeight = computeGrossWeight(form.netWeightGrams, form.wastagePercent);
  const buyPriceInGold = computeBuyPriceInGold(form.kaat);

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageError("");
    try {
      const dataUrls = await Promise.all(Array.from(files).map((f) => fileToResizedDataUrl(f)));
      setForm((f) => ({ ...f, images: [...f.images, ...dataUrls] }));
    } catch {
      setImageError("Couldn't load one of the images. Try a different file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
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
            {initial ? "Edit Stock" : "Add Stock"}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Images
            </span>
            <div className="flex flex-wrap gap-2">
              {form.images.map((src, i) => (
                <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-gold-900/40">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gold-900/50 text-ink-500 transition hover:border-gold-600/60 hover:text-gold-300"
              >
                <ImagePlus size={18} />
                <span className="text-[10px]">Add</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>
            {imageError && <p className="mt-1.5 text-xs text-rose-400">{imageError}</p>}
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
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Net Weight (grams)">
              <input
                type="number"
                min={0}
                step={0.01}
                required
                value={form.netWeightGrams || ""}
                onChange={(e) => update("netWeightGrams", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Wastage %">
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.wastagePercent || ""}
                onChange={(e) => update("wastagePercent", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Gross Weight (auto)">
              <div className="input flex items-center justify-between bg-ink-900/60 text-gold-300">
                {grossWeight.toFixed(3)} g
              </div>
            </Field>

            <Field label="Kaat">
              <input
                type="number"
                min={0}
                max={95}
                step={0.01}
                value={form.kaat || ""}
                onChange={(e) => update("kaat", Number(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Buy Price in Gold (auto)" span2>
              <div className="input flex items-center justify-between bg-ink-900/60 text-gold-300">
                <span>{buyPriceInGold ? buyPriceInGold.toFixed(4) : "—"}</span>
                {form.kaat > 0 && (
                  <span className="text-[11px] text-ink-500">
                    96 − {form.kaat} = {96 - form.kaat} → 96 ÷ {96 - form.kaat}
                  </span>
                )}
              </div>
            </Field>

            <Field label="Stock Quantity" span2>
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
            {initial ? "Save Changes" : "Add Stock"}
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
