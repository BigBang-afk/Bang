import { useMemo, useState } from "react";
import { Scale, Plus, Minus, Trash2, ShoppingBag, X, Printer } from "lucide-react";
import { useInventoryStore, type Product, type Category, categories as allCategories } from "../store/inventoryStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSalesStore, type PaymentMethod, type SaleLineItem, type Sale } from "../store/salesStore";
import { useSettingsStore } from "../store/settingsStore";
import { computeProductPrice } from "../lib/pricing";
import { formatMoney, formatDateTime } from "../lib/format";
import ProductThumb from "../components/ProductThumb";

interface CartLine {
  product: Product;
  qty: number;
}

const categories: (Category | "All")[] = ["All", ...allCategories];
const WEIGHT_TOLERANCE = 0.5;

export default function POS() {
  const products = useInventoryStore((s) => s.products);
  const adjustStock = useInventoryStore((s) => s.adjustStock);
  const rates = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);
  const settings = useSettingsStore();
  const addSale = useSalesStore((s) => s.addSale);

  const [category, setCategory] = useState<Category | "All">("All");
  const [weightQuery, setWeightQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const weightValue = weightQuery.trim() === "" ? null : Number(weightQuery);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      const matchesWeight =
        weightValue === null ||
        Number.isNaN(weightValue) ||
        Math.abs(p.netWeightGrams - weightValue) <= WEIGHT_TOLERANCE;
      return matchesCategory && matchesWeight;
    });
  }, [products, category, weightValue]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      if (product.stock <= 0) return prev;
      return [...prev, { product, qty: 1 }];
    });
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, qty: Math.min(l.product.stock, Math.max(1, l.qty + delta)) }
            : l
        )
        .filter((l) => l.qty > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, l) => {
    const { total } = computeProductPrice(l.product, rates);
    return sum + total * l.qty;
  }, 0);
  const total = Math.max(0, subtotal - discount);

  function handleCheckout() {
    if (cart.length === 0) return;
    const items: SaleLineItem[] = cart.map((l) => {
      const breakdown = computeProductPrice(l.product, rates);
      return {
        productId: l.product.id,
        name: l.product.name,
        sku: l.product.sku,
        category: l.product.category,
        netWeightGrams: l.product.netWeightGrams,
        grossWeightGrams: l.product.grossWeightGrams,
        kaat: l.product.kaat,
        buyPriceInGold: l.product.buyPriceInGold,
        qty: l.qty,
        ratePerGram: breakdown.ratePerGram,
        lineTotal: breakdown.total * l.qty,
      };
    });

    const sale = addSale({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items,
      subtotal,
      discount,
      total,
      paymentMethod,
    });

    cart.forEach((l) => adjustStock(l.product.id, -l.qty));
    setCompletedSale(sale);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount(0);
    setPaymentMethod("Cash");
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex-1 p-4 md:p-6 print:hidden">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
          Step 1 — Select a category
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((c) => (
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

        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
          Step 2 — Search by weight
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gold-900/50 bg-ink-900/50 px-3 sm:max-w-xs">
            <Scale size={16} className="text-ink-500" />
            <input
              type="number"
              min={0}
              step={0.01}
              value={weightQuery}
              onChange={(e) => setWeightQuery(e.target.value)}
              placeholder="Item weight in grams..."
              className="w-full bg-transparent py-2.5 text-sm text-[#ece6d9] outline-none placeholder:text-ink-600"
            />
          </div>
          {weightValue !== null && !Number.isNaN(weightValue) && (
            <p className="text-xs text-ink-500">
              Showing items within ±{WEIGHT_TOLERANCE}g of {weightValue}g
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const { total: price } = computeProductPrice(p, rates);
            const outOfStock = p.stock <= 0;
            return (
              <button
                key={p.id}
                disabled={outOfStock}
                onClick={() => addToCart(p)}
                className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                  outOfStock
                    ? "cursor-not-allowed border-ink-700 bg-ink-900/30 opacity-50"
                    : "border-gold-900/30 bg-ink-900/40 hover:border-gold-600/60 hover:bg-ink-900/70"
                }`}
              >
                <ProductThumb images={p.images} fill className="mb-2" />
                <div className="truncate text-sm font-medium text-[#ece6d9]">{p.name}</div>
                <div className="mt-0.5 text-[11px] text-ink-500">
                  {p.category} · {p.netWeightGrams}g · Kaat {p.kaat}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-serif text-sm font-semibold text-gold-300">
                    {formatMoney(price, currency)}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      outOfStock ? "text-rose-400" : p.stock <= 5 ? "text-amber-400" : "text-ink-500"
                    }`}
                  >
                    {outOfStock ? "Out of stock" : `${p.stock} in stock`}
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-ink-500">
              No products match this category / weight.
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col border-t border-gold-900/30 bg-ink-900/40 lg:w-96 lg:border-l lg:border-t-0 print:hidden">
        <div className="flex items-center gap-2 border-b border-gold-900/30 px-5 py-4">
          <ShoppingBag size={18} className="text-gold-400" />
          <h2 className="font-serif text-lg font-semibold text-gold-100">Current Sale</h2>
          <span className="ml-auto rounded-full bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-300">
            {cart.length} item{cart.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="max-h-72 flex-1 overflow-y-auto px-5 py-3">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">
              Select a category and weight, then tap a product to add it.
            </p>
          ) : (
            <div className="space-y-3">
              {cart.map((l) => {
                const { total: lineUnitPrice } = computeProductPrice(l.product, rates);
                return (
                  <div key={l.product.id} className="flex items-center gap-3">
                    <ProductThumb images={l.product.images} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#ece6d9]">
                        {l.product.name}
                      </div>
                      <div className="text-xs text-ink-500">
                        {formatMoney(lineUnitPrice, currency)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => changeQty(l.product.id, -1)}
                        className="rounded-md border border-gold-900/40 p-1 text-ink-500 hover:text-gold-300"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-sm text-[#ece6d9]">{l.qty}</span>
                      <button
                        onClick={() => changeQty(l.product.id, 1)}
                        disabled={l.qty >= l.product.stock}
                        className="rounded-md border border-gold-900/40 p-1 text-ink-500 hover:text-gold-300 disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(l.product.id)}
                      className="text-ink-600 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-gold-900/30 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="rounded-lg border border-gold-900/40 bg-ink-950 px-2.5 py-2 text-xs text-[#ece6d9] outline-none placeholder:text-ink-600 focus:border-gold-600/60"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="rounded-lg border border-gold-900/40 bg-ink-950 px-2.5 py-2 text-xs text-[#ece6d9] outline-none placeholder:text-ink-600 focus:border-gold-600/60"
            />
          </div>

          <div className="flex items-center gap-2">
            {(["Cash", "Card", "Bank Transfer"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition ${
                  paymentMethod === m
                    ? "border-gold-600 bg-gold-500/15 text-gold-300"
                    : "border-gold-900/40 text-ink-500 hover:text-gold-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-[#a89a7d]">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-[#a89a7d]">
            <span>Discount</span>
            <input
              type="number"
              min={0}
              value={discount || ""}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-24 rounded-md border border-gold-900/40 bg-ink-950 px-2 py-1 text-right text-sm text-[#ece6d9] outline-none focus:border-gold-600/60"
            />
          </div>
          <div className="flex items-center justify-between border-t border-gold-900/30 pt-3">
            <span className="font-serif text-base font-semibold text-gold-100">Total</span>
            <span className="font-serif text-xl font-bold text-gold-300">
              {formatMoney(total, currency)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 py-3 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 transition hover:from-gold-500 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Complete Sale
          </button>
        </div>
      </div>

      {completedSale && (
        <InvoiceModal
          sale={completedSale}
          currency={currency}
          shop={settings}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}

function InvoiceModal({
  sale,
  currency,
  shop,
  onClose,
}: {
  sale: Sale;
  currency: string;
  shop: { shopName: string; shopTagline: string; shopAddress: string; shopPhone: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="animate-rise my-4 w-full max-w-3xl print:my-0 print:max-w-none">
        <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-gold-800/50 bg-ink-950 px-5 py-4 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-gold-100">Sale Complete</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-gold-800/50 px-3 py-2 text-sm font-medium text-[#c9bd9e] hover:border-gold-600"
            >
              <Printer size={15} /> Print Invoice
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
            >
              New Sale
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
              <h2 className="text-xl font-bold tracking-wide text-neutral-900">INVOICE</h2>
              <p className="text-xs text-neutral-600">Invoice #: {sale.invoiceNo}</p>
              <p className="text-xs text-neutral-600">Date: {formatDateTime(sale.date)}</p>
            </div>
          </div>

          <div className="mt-5 flex justify-between text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Billed To</p>
              <p className="font-medium">{sale.customerName || "Walk-in Customer"}</p>
              {sale.customerPhone && <p className="text-neutral-600">{sale.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Payment Method</p>
              <p className="font-medium">{sale.paymentMethod}</p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2 text-right">Net Wt</th>
                <th className="py-2 pr-2 text-right">Gross Wt</th>
                <th className="py-2 pr-2 text-right">Kaat</th>
                <th className="py-2 pr-2 text-right">Rate/g</th>
                <th className="py-2 pr-2 text-right">Qty</th>
                <th className="py-2 pl-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it, i) => (
                <tr key={i} className="border-b border-neutral-200">
                  <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-[10px] text-neutral-500">{it.sku}</div>
                  </td>
                  <td className="py-2 pr-2 text-neutral-600">{it.category}</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{it.netWeightGrams}g</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{it.grossWeightGrams.toFixed(2)}g</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{it.kaat}</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{formatMoney(it.ratePerGram, currency)}</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{it.qty}</td>
                  <td className="py-2 pl-2 text-right font-medium">{formatMoney(it.lineTotal, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span>{formatMoney(sale.subtotal, currency)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Discount</span>
                  <span>-{formatMoney(sale.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-neutral-900 pt-1.5 text-base font-bold">
                <span>Total</span>
                <span>{formatMoney(sale.total, currency)}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 flex items-end justify-between text-[11px] text-neutral-500">
            <div className="max-w-xs">
              <p>Thank you for shopping with {shop.shopName}.</p>
              <p>Goods once sold are not exchangeable or refundable without this invoice.</p>
            </div>
            <div className="text-center">
              <div className="mb-1 w-40 border-b border-neutral-400" />
              <p>Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
