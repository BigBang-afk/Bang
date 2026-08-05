import { useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Scale,
  Coins,
  ImagePlus,
  Layers,
  Package,
  Printer,
  FolderPlus,
  Share2,
} from "lucide-react";
import {
  useInventoryStore,
  computeGrossWeight,
  computeBuyPriceInGold,
  type Product,
  type Category,
  type ProductFormInput,
} from "../store/inventoryStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { computeProductPrice } from "../lib/pricing";
import { formatMoney, formatDateTime } from "../lib/format";
import { fileToResizedDataUrl } from "../lib/image";
import ProductThumb from "../components/ProductThumb";
import StatCard from "../components/StatCard";
import AddCategoryModal from "../components/AddCategoryModal";
import ShareItemModal from "../components/ShareItemModal";

const emptyForm: ProductFormInput = {
  name: "",
  category: "Ring",
  netWeightGrams: 0,
  wastagePercent: 0,
  kaat: 0,
  images: [],
};

export default function Inventory() {
  const products = useInventoryStore((s) => s.products);
  const allCategories = useInventoryStore((s) => s.categories);
  const addCategory = useInventoryStore((s) => s.addCategory);
  const addProduct = useInventoryStore((s) => s.addProduct);
  const updateProduct = useInventoryStore((s) => s.updateProduct);
  const removeProduct = useInventoryStore((s) => s.removeProduct);
  const rates = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);
  const shop = useSettingsStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [sharing, setSharing] = useState<Product | null>(null);

  const categoryTabs = useMemo<(Category | "All")[]>(() => ["All", ...allCategories], [allCategories]);

  const inStock = useMemo(() => products.filter((p) => p.stock > 0), [products]);

  const filtered = useMemo(
    () =>
      inStock.filter((p) => {
        const matchesCategory = category === "All" || p.category === category;
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [inStock, category, search]
  );

  const totalNetWeight = filtered.reduce((sum, p) => sum + p.netWeightGrams * p.stock, 0);
  const totalBuyPriceInGold = filtered.reduce((sum, p) => sum + p.buyPriceInGold * p.stock, 0);
  const totalValue = filtered.reduce((sum, p) => sum + computeProductPrice(p, rates).total * p.stock, 0);

  const showCategoryGrid = category === "All" && search.trim() === "";

  const categoryStats = useMemo(
    () =>
      allCategories.map((c) => {
        const items = inStock.filter((p) => p.category === c);
        return {
          category: c,
          count: items.length,
          netWeight: items.reduce((sum, p) => sum + p.netWeightGrams * p.stock, 0),
          buyPriceInGold: items.reduce((sum, p) => sum + p.buyPriceInGold * p.stock, 0),
          value: items.reduce((sum, p) => sum + computeProductPrice(p, rates).total * p.stock, 0),
        };
      }),
    [inStock, rates, allCategories]
  );

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setShowForm(true);
  }

  function handleSubmit(form: ProductFormInput) {
    if (editing) {
      updateProduct(editing.id, form);
    } else {
      addProduct(form);
    }
    setShowForm(false);
    setEditing(null);
  }

  function handleSubmitMultiple(rows: ProductFormInput[]) {
    rows.forEach((row) => addProduct(row));
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">Inventory</h1>
          <p className="text-sm text-ink-500">{inStock.length} products in stock</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReport(true)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg border border-gold-800/50 px-4 py-2.5 text-sm font-medium text-[#c9bd9e] transition hover:border-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={16} /> Print Report
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 hover:from-gold-500 hover:to-gold-400"
          >
            <Plus size={16} /> Add Stock
          </button>
        </div>
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
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-gold-900/50 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:border-gold-600/60 hover:text-gold-300"
          >
            <FolderPlus size={13} /> Add Category
          </button>
        </div>
      </div>

      {showCategoryGrid ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categoryStats.map((s) => (
            <button
              key={s.category}
              onClick={() => setCategory(s.category)}
              disabled={s.count === 0}
              className={`rounded-2xl border p-5 text-left transition ${
                s.count === 0
                  ? "cursor-not-allowed border-gold-900/15 bg-ink-900/20 opacity-50"
                  : "border-gold-900/25 bg-ink-900/40 hover:border-gold-600/60 hover:bg-ink-900/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg font-semibold text-gold-100">{s.category}</span>
                <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-300">
                  {s.count}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-ink-500">
                <div className="flex justify-between">
                  <span>Net Weight</span>
                  <span className="text-[#c9bd9e]">{s.netWeight.toFixed(2)} g</span>
                </div>
                <div className="flex justify-between">
                  <span>Buy Price in Gold</span>
                  <span className="text-[#c9bd9e]">{s.buyPriceInGold.toFixed(3)} g</span>
                </div>
                <div className="flex justify-between border-t border-gold-900/25 pt-1.5">
                  <span>Value</span>
                  <span className="font-medium text-gold-300">{formatMoney(s.value, currency)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
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
                    <td className="px-4 py-3 text-gold-300 font-medium">{p.buyPriceInGold.toFixed(3)} g</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        In Stock
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gold-300">
                      {formatMoney(total, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSharing(p)}
                          title="Share on WhatsApp"
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-emerald-400"
                        >
                          <Share2 size={14} />
                        </button>
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
      )}

      {showForm && (
        <ProductFormModal
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          onSubmitMultiple={handleSubmitMultiple}
        />
      )}

      {showReport && (
        <InventoryReportModal
          products={filtered}
          categoryStats={categoryStats}
          groupByCategory={category === "All"}
          rates={rates}
          totals={{ netWeight: totalNetWeight, buyPriceInGold: totalBuyPriceInGold, value: totalValue }}
          categoryLabel={category === "All" ? "All Categories" : category}
          shop={shop}
          currency={currency}
          onClose={() => setShowReport(false)}
        />
      )}

      {showAddCategory && (
        <AddCategoryModal
          onCancel={() => setShowAddCategory(false)}
          onAdd={(name) => {
            const added = addCategory(name);
            if (added) setCategory(added);
            setShowAddCategory(false);
          }}
        />
      )}

      {sharing && <ShareItemModal product={sharing} onClose={() => setSharing(null)} />}

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

interface CategoryStat {
  category: Category;
  count: number;
  netWeight: number;
  buyPriceInGold: number;
  value: number;
}

function InventoryReportModal({
  products,
  categoryStats,
  groupByCategory,
  rates,
  totals,
  categoryLabel,
  shop,
  currency,
  onClose,
}: {
  products: Product[];
  categoryStats: CategoryStat[];
  groupByCategory: boolean;
  rates: { k21: number };
  totals: { netWeight: number; buyPriceInGold: number; value: number };
  categoryLabel: string;
  shop: { shopName: string; shopTagline: string; shopAddress: string; shopPhone: string };
  currency: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="animate-rise my-4 w-full max-w-4xl print:my-0 print:max-w-none">
        <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-gold-800/50 bg-ink-950 px-5 py-4 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-gold-100">Inventory Report — {categoryLabel}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-gold-800/50 px-3 py-2 text-sm font-medium text-[#c9bd9e] hover:border-gold-600"
            >
              <Printer size={15} /> Print Report
            </button>
            <button onClick={onClose} className="ml-1 text-ink-500 hover:text-gold-300">
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          id="invoice"
          className="w-full bg-white p-10 text-neutral-900 shadow-2xl print:w-[210mm] print:min-h-[297mm] print:p-[14mm] print:shadow-none"
        >
          <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
            <div>
              <h1 className="font-serif text-2xl font-bold">{shop.shopName}</h1>
              <p className="text-xs text-neutral-600">{shop.shopTagline}</p>
              <p className="text-xs text-neutral-600">{shop.shopAddress}</p>
              <p className="text-xs text-neutral-600">{shop.shopPhone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold tracking-wide text-neutral-900">INVENTORY REPORT</h2>
              <p className="text-xs text-neutral-600">Category: {categoryLabel}</p>
              <p className="text-xs text-neutral-600">Generated: {formatDateTime(new Date().toISOString())}</p>
              <p className="text-xs text-neutral-600">21K Rate: {formatMoney(rates.k21, currency)}/g</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Products</p>
              <p className="font-semibold">{products.length}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Net Weight</p>
              <p className="font-semibold">{totals.netWeight.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Buy Price in Gold</p>
              <p className="font-semibold">{totals.buyPriceInGold.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Total Value</p>
              <p className="font-semibold">{formatMoney(totals.value, currency)}</p>
            </div>
          </div>

          {groupByCategory ? (
            <table className="mt-6 w-full border-collapse text-sm">
              <thead>
                <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2 text-right">Products</th>
                  <th className="py-2 pr-2 text-right">Net Weight</th>
                  <th className="py-2 pr-2 text-right">Buy Price in Gold</th>
                  <th className="py-2 pl-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((s, i) => (
                  <tr key={s.category} className="border-b border-neutral-200">
                    <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium">{s.category}</td>
                    <td className="py-2 pr-2 text-right text-neutral-600">{s.count}</td>
                    <td className="py-2 pr-2 text-right text-neutral-600">{s.netWeight.toFixed(2)}g</td>
                    <td className="py-2 pr-2 text-right text-neutral-600">{s.buyPriceInGold.toFixed(3)}g</td>
                    <td className="py-2 pl-2 text-right font-medium">{formatMoney(s.value, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-900 text-sm font-bold">
                  <td colSpan={2} />
                  <td className="py-2 pr-2 text-right">{products.length}</td>
                  <td className="py-2 pr-2 text-right">{totals.netWeight.toFixed(2)}g</td>
                  <td className="py-2 pr-2 text-right">{totals.buyPriceInGold.toFixed(3)}g</td>
                  <td className="py-2 pl-2 text-right">{formatMoney(totals.value, currency)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="mt-6 w-full border-collapse text-sm">
              <thead>
                <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2 text-right">Net Wt</th>
                  <th className="py-2 pr-2 text-right">Gross Wt</th>
                  <th className="py-2 pr-2 text-right">Kaat</th>
                  <th className="py-2 pr-2 text-right">Buy Price in Gold</th>
                  <th className="py-2 pl-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const { total } = computeProductPrice(p, rates);
                  return (
                    <tr key={p.id} className="border-b border-neutral-200">
                      <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[10px] text-neutral-500">{p.sku}</div>
                      </td>
                      <td className="py-2 pr-2 text-neutral-600">{p.category}</td>
                      <td className="py-2 pr-2 text-right text-neutral-600">{p.netWeightGrams}g</td>
                      <td className="py-2 pr-2 text-right text-neutral-600">{p.grossWeightGrams.toFixed(2)}g</td>
                      <td className="py-2 pr-2 text-right text-neutral-600">{p.kaat}</td>
                      <td className="py-2 pr-2 text-right text-neutral-600">{p.buyPriceInGold.toFixed(3)}g</td>
                      <td className="py-2 pl-2 text-right font-medium">{formatMoney(total, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-900 text-sm font-bold">
                  <td colSpan={3} />
                  <td className="py-2 pr-2 text-right">{totals.netWeight.toFixed(2)}g</td>
                  <td className="py-2 pr-2" />
                  <td className="py-2 pr-2" />
                  <td className="py-2 pr-2 text-right">{totals.buyPriceInGold.toFixed(3)}g</td>
                  <td className="py-2 pl-2 text-right">{formatMoney(totals.value, currency)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          <div className="mt-16 text-[11px] text-neutral-500">
            <p>{shop.shopName} — inventory report generated from the private POS system.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

let bulkRowSeq = 0;
function nextRowKey() {
  bulkRowSeq += 1;
  return `row-${bulkRowSeq}`;
}

function ProductFormModal({
  initial,
  onCancel,
  onSubmit,
  onSubmitMultiple,
}: {
  initial: Product | null;
  onCancel: () => void;
  onSubmit: (form: ProductFormInput) => void;
  onSubmitMultiple: (rows: ProductFormInput[]) => void;
}) {
  const allCategories = useInventoryStore((s) => s.categories);
  const addCategory = useInventoryStore((s) => s.addCategory);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [form, setForm] = useState<ProductFormInput>(
    initial
      ? {
          name: initial.name,
          category: initial.category,
          netWeightGrams: initial.netWeightGrams,
          wastagePercent: initial.wastagePercent,
          kaat: initial.kaat,
          images: initial.images,
        }
      : emptyForm
  );
  const [rows, setRows] = useState<(ProductFormInput & { _key: string })[]>([
    { ...emptyForm, _key: nextRowKey() },
  ]);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grossWeight = computeGrossWeight(form.netWeightGrams, form.wastagePercent);
  const buyPriceInGold = computeBuyPriceInGold(form.netWeightGrams, form.kaat);

  function update<K extends keyof ProductFormInput>(key: K, value: ProductFormInput[K]) {
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

  function addRow() {
    setRows((prev) => [...prev, { ...emptyForm, _key: nextRowKey() }]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r._key !== key) : prev));
  }

  function updateRow(key: string, patch: Partial<ProductFormInput>) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "single") {
      if (!form.name.trim()) return;
      onSubmit(form);
    } else {
      const valid = rows.filter((r) => r.name.trim());
      if (valid.length === 0) return;
      onSubmitMultiple(valid.map(({ _key, ...rest }) => rest));
    }
  }

  const validRowCount = rows.filter((r) => r.name.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-gold-100">
            {initial ? "Edit Stock" : "Add Stock"}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        {!initial && (
          <div className="flex gap-2 border-b border-gold-900/40 px-6 py-3">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                mode === "single"
                  ? "border-gold-600 bg-gold-500/15 text-gold-300"
                  : "border-gold-900/40 text-ink-500 hover:text-gold-300"
              }`}
            >
              <Package size={14} /> Single Item
            </button>
            <button
              type="button"
              onClick={() => setMode("multiple")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                mode === "multiple"
                  ? "border-gold-600 bg-gold-500/15 text-gold-300"
                  : "border-gold-900/40 text-ink-500 hover:text-gold-300"
              }`}
            >
              <Layers size={14} /> Multiple Items
            </button>
          </div>
        )}

        {mode === "single" || initial ? (
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

              <Field label="Category">
                <div className="flex gap-1.5">
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
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    title="Add new category"
                    className="shrink-0 rounded-lg border border-gold-900/50 px-2.5 text-ink-500 hover:border-gold-600 hover:text-gold-300"
                  >
                    <FolderPlus size={16} />
                  </button>
                </div>
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
                  step={0.01}
                  value={form.kaat || ""}
                  onChange={(e) => update("kaat", Number(e.target.value) || 0)}
                  className="input"
                />
              </Field>
              <Field label="Buy Price in Gold (auto)">
                <div className="input flex items-center justify-between bg-ink-900/60 text-gold-300">
                  {buyPriceInGold ? `${buyPriceInGold.toFixed(3)} g` : "—"}
                </div>
              </Field>
              {form.kaat > 0 && form.netWeightGrams > 0 && (
                <p className="col-span-2 -mt-2 text-[11px] text-ink-500">
                  {form.netWeightGrams} ÷ 96 × {form.kaat} = {buyPriceInGold.toFixed(3)} g
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-6 py-5">
            {rows.map((row, i) => (
              <BulkRow
                key={row._key}
                index={i}
                row={row}
                onChange={(patch) => updateRow(row._key, patch)}
                onRemove={() => removeRow(row._key)}
                canRemove={rows.length > 1}
              />
            ))}
            <button
              type="button"
              onClick={addRow}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gold-900/50 py-2.5 text-sm font-medium text-ink-500 transition hover:border-gold-600/60 hover:text-gold-300"
            >
              <Plus size={15} /> Add Another Item
            </button>
          </div>
        )}

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
            {initial
              ? "Save Changes"
              : mode === "single"
              ? "Add Stock"
              : `Save All (${validRowCount} item${validRowCount === 1 ? "" : "s"})`}
          </button>
        </div>
      </form>

      {showAddCategory && (
        <AddCategoryModal
          onCancel={() => setShowAddCategory(false)}
          onAdd={(name) => {
            const added = addCategory(name);
            if (added) update("category", added);
            setShowAddCategory(false);
          }}
        />
      )}
    </div>
  );
}

function BulkRow({
  index,
  row,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  row: ProductFormInput;
  onChange: (patch: Partial<ProductFormInput>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const allCategories = useInventoryStore((s) => s.categories);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const grossWeight = computeGrossWeight(row.netWeightGrams, row.wastagePercent);
  const buyPriceInGold = computeBuyPriceInGold(row.netWeightGrams, row.kaat);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const dataUrls = await Promise.all(Array.from(files).map((f) => fileToResizedDataUrl(f)));
      onChange({ images: [...row.images, ...dataUrls] });
    } catch {
      // ignore silently in bulk mode
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-gold-900/30 bg-ink-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gold-500/70">
          Item {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-rose-400"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="shrink-0">
          {row.images[0] ? (
            <div className="group relative h-14 w-14 overflow-hidden rounded-lg border border-gold-900/40">
              <img src={row.images[0]} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange({ images: [] })}
                className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gold-900/50 text-ink-500 hover:border-gold-600/60 hover:text-gold-300"
            >
              <ImagePlus size={16} />
              <span className="text-[9px]">Add</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
          <input
            value={row.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Item name"
            className="input col-span-2 sm:col-span-1"
          />
          <select
            value={row.category}
            onChange={(e) => onChange({ category: e.target.value as Category })}
            className="input"
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step={0.01}
            value={row.netWeightGrams || ""}
            onChange={(e) => onChange({ netWeightGrams: Number(e.target.value) || 0 })}
            placeholder="Net wt (g)"
            className="input"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            value={row.wastagePercent || ""}
            onChange={(e) => onChange({ wastagePercent: Number(e.target.value) || 0 })}
            placeholder="Wastage %"
            className="input"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            value={row.kaat || ""}
            onChange={(e) => onChange({ kaat: Number(e.target.value) || 0 })}
            placeholder="Kaat"
            className="input"
          />
          <div className="input flex items-center bg-ink-900/60 text-xs text-gold-300">
            Gross {grossWeight.toFixed(2)}g · Gold {buyPriceInGold.toFixed(3)}g
          </div>
        </div>
      </div>
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
