import { useMemo, useState } from "react";
import {
  Users,
  Share2,
  Radio,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Send,
  RefreshCw,
  Check,
  CheckCircle2,
  Circle,
  Tag,
  UserPlus,
  MessageCircle,
  Shuffle,
} from "lucide-react";
import { useCustomerStore, type Customer, type CustomerFormInput } from "../store/customerStore";
import { useSalesStore } from "../store/salesStore";
import { useInventoryStore, type Product, type Category } from "../store/inventoryStore";
import {
  useMarketingStore,
  type MessageTemplate,
  type TemplateInput,
  type Campaign,
} from "../store/marketingStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { computeProductPrice } from "../lib/pricing";
import { formatMoney, formatDateTime } from "../lib/format";
import { openWhatsApp, renderTemplate } from "../lib/whatsapp";
import StatCard from "../components/StatCard";
import ProductThumb from "../components/ProductThumb";
import ConfirmDialog from "../components/ConfirmDialog";
import ShareItemModal from "../components/ShareItemModal";

type Tab = "customers" | "share" | "broadcast" | "templates";

export default function Marketing() {
  const [tab, setTab] = useState<Tab>("customers");

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "customers", label: "Customers", icon: Users },
    { id: "share", label: "Share Item", icon: Share2 },
    { id: "broadcast", label: "Broadcast", icon: Radio },
    { id: "templates", label: "Templates & Quotes", icon: Sparkles },
  ];

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">Marketing</h1>
          <p className="text-sm text-ink-500">
            Attract customers on WhatsApp — share items, run broadcasts, grow your business
          </p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-gold-900/40 bg-ink-900/50 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id ? "bg-gold-500/15 text-gold-300" : "text-ink-500 hover:text-gold-300"
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "customers" && <CustomersTab />}
      {tab === "share" && <ShareTab />}
      {tab === "broadcast" && <BroadcastTab />}
      {tab === "templates" && <TemplatesTab />}
    </div>
  );
}

function CustomersTab() {
  const customers = useCustomerStore((s) => s.customers);
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const removeCustomer = useCustomerStore((s) => s.removeCustomer);
  const importFromSales = useCustomerStore((s) => s.importFromSales);
  const sales = useSalesStore((s) => s.sales);
  const shopName = useSettingsStore((s) => s.shopName);

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | "All">("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [syncMessage, setSyncMessage] = useState("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [customers]);

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        const matchesTag = tagFilter === "All" || c.tags.includes(tagFilter);
        const matchesSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.toLowerCase().includes(search.toLowerCase());
        return matchesTag && matchesSearch;
      }),
    [customers, search, tagFilter]
  );

  const fromSales = customers.filter((c) => c.source === "sale").length;
  const manual = customers.filter((c) => c.source === "manual").length;

  function handleSync() {
    const added = importFromSales(sales.map((s) => ({ customerName: s.customerName, customerPhone: s.customerPhone })));
    setSyncMessage(added > 0 ? `Imported ${added} new customer${added === 1 ? "" : "s"} from Sales History.` : "No new customers to import — everyone's already synced.");
    setTimeout(() => setSyncMessage(""), 4000);
  }

  function handleSubmit(input: CustomerFormInput) {
    if (editing) updateCustomer(editing.id, input);
    else addCustomer(input);
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSync}
            className="flex items-center gap-2 rounded-lg border border-gold-800/50 px-4 py-2.5 text-sm font-medium text-[#c9bd9e] transition hover:border-gold-600"
          >
            <RefreshCw size={15} /> Sync from Sales
          </button>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 hover:from-gold-500 hover:to-gold-400"
        >
          <UserPlus size={16} /> Add Customer
        </button>
      </div>

      {syncMessage && (
        <p className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-4 py-2.5 text-sm text-emerald-300">
          {syncMessage}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Customers" value={String(customers.length)} icon={Users} accent />
        <StatCard label="From Sales" value={String(fromSales)} icon={RefreshCw} />
        <StatCard label="Manually Added" value={String(manual)} icon={UserPlus} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-gold-900/50 bg-ink-900/50 px-3 sm:max-w-sm">
          <Search size={16} className="text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full bg-transparent py-2.5 text-sm text-[#ece6d9] outline-none placeholder:text-ink-600"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(["All", ...allTags] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  tagFilter === t
                    ? "border-gold-600 bg-gold-500/15 text-gold-300"
                    : "border-gold-900/40 text-ink-500 hover:border-gold-800 hover:text-gold-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gold-900/25 bg-ink-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-900/30 text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-gold-900/10 last:border-0 hover:bg-ink-800/30">
                <td className="px-4 py-3 font-medium text-[#ece6d9]">{c.name}</td>
                <td className="px-4 py-3 text-ink-500">{c.phone}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.length === 0 ? (
                      <span className="text-ink-600">—</span>
                    ) : (
                      c.tags.map((t) => (
                        <span key={t} className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[10px] font-medium text-gold-300">
                          {t}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-500 capitalize">{c.source === "sale" ? "Sale" : "Manual"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() =>
                        openWhatsApp(c.phone, `Hi ${c.name.split(" ")[0]}, this is ${shopName}! `)
                      }
                      title="Chat on WhatsApp"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-emerald-400"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(c);
                        setShowForm(true);
                      }}
                      title="Edit"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-gold-300"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c)}
                      title="Delete"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                  No customers yet. Add one or sync from Sales History.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CustomerFormModal
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Customer"
          message={`Remove ${confirmDelete.name} from your customer list? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            removeCustomer(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerFormModal({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Customer | null;
  onCancel: () => void;
  onSubmit: (input: CustomerFormInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise w-full max-w-md rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-gold-100">
            {initial ? "Edit Customer" : "Add Customer"}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Phone (with country code)
            </span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 923001234567"
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Tags (comma separated)
            </span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. VIP, Bridal, Regular"
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
          </label>
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
            {initial ? "Save Changes" : "Add Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ShareTab() {
  const products = useInventoryStore((s) => s.products);
  const allCategories = useInventoryStore((s) => s.categories);
  const rates = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [sharing, setSharing] = useState<Product | null>(null);

  const inStock = useMemo(() => products.filter((p) => p.stock > 0), [products]);
  const categoryTabs = useMemo<(Category | "All")[]>(() => ["All", ...allCategories], [allCategories]);

  const filtered = useMemo(
    () =>
      inStock.filter((p) => {
        const matchesCategory = category === "All" || p.category === category;
        const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [inStock, category, search]
  );

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setSharing(p)}
            className="group rounded-2xl border border-gold-900/25 bg-ink-900/40 p-3 text-left transition hover:border-gold-600/60 hover:bg-ink-900/70"
          >
            <ProductThumb images={p.images} fill />
            <div className="mt-2.5 truncate font-medium text-[#ece6d9]">{p.name}</div>
            <div className="text-xs text-ink-500">
              {p.category} · {p.grossWeightGrams.toFixed(2)}g
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-gold-300">
                {formatMoney(computeProductPrice(p, rates).total, currency)}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 opacity-0 transition group-hover:opacity-100">
                <Share2 size={12} /> Share
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-gold-900/25 bg-ink-900/40 py-16">
            <Share2 size={32} className="mb-3 text-ink-600" />
            <p className="text-sm text-ink-500">No products found.</p>
          </div>
        )}
      </div>

      {sharing && <ShareItemModal product={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}

function BroadcastTab() {
  const products = useInventoryStore((s) => s.products);
  const customers = useCustomerStore((s) => s.customers);
  const templates = useMarketingStore((s) => s.templates);
  const quotes = useMarketingStore((s) => s.quotes);
  const campaigns = useMarketingStore((s) => s.campaigns);
  const createCampaign = useMarketingStore((s) => s.createCampaign);
  const removeCampaign = useMarketingStore((s) => s.removeCampaign);
  const rates = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);
  const shop = useSettingsStore();

  const inStock = useMemo(() => products.filter((p) => p.stock > 0), [products]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [customers]);

  const [productId, setProductId] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [quote, setQuote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)] ?? "");
  const [tagFilter, setTagFilter] = useState<string | "All">("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const [confirmDeleteCampaign, setConfirmDeleteCampaign] = useState<Campaign | null>(null);

  const product = inStock.find((p) => p.id === productId) ?? null;
  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) => {
        const matchesTag = tagFilter === "All" || c.tags.includes(tagFilter);
        const matchesSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.toLowerCase().includes(search.toLowerCase());
        return matchesTag && matchesSearch;
      }),
    [customers, tagFilter, search]
  );

  const message = useMemo(() => {
    const vars: Record<string, string> = {
      shopName: shop.shopName,
      shopAddress: shop.shopAddress,
      shopPhone: shop.shopPhone,
      quote,
      customerName: "there",
      itemName: product?.name ?? "",
      category: product?.category ?? "",
      grossWeight: product ? `${product.grossWeightGrams.toFixed(2)}g` : "",
      rate: `${formatMoney(rates.k21, currency)}/g`,
      price: product ? formatMoney(computeProductPrice(product, rates).total, currency) : "",
    };
    return renderTemplate(template?.body ?? "", vars);
  }, [template, quote, product, rates, currency, shop]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function shuffleQuote() {
    if (quotes.length === 0) return;
    let next = quote;
    if (quotes.length > 1) {
      while (next === quote) next = quotes[Math.floor(Math.random() * quotes.length)];
    }
    setQuote(next);
  }

  function handleCreateCampaign() {
    if (selectedIds.size === 0) return;
    const name = product ? `${product.name} — ${new Date().toLocaleDateString()}` : `Promotion — ${new Date().toLocaleDateString()}`;
    const campaign = createCampaign({
      name,
      message,
      productId: product?.id ?? null,
      productName: product?.name ?? null,
      customerIds: Array.from(selectedIds),
    });
    setOpenCampaignId(campaign.id);
    clearSelection();
  }

  const openCampaign = campaigns.find((c) => c.id === openCampaignId) ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">
          1. Compose Broadcast
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Feature an item (optional)
            </span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input">
              <option value="">General promotion — no specific item</option>
              {inStock.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.category} — {p.name} ({p.grossWeightGrams.toFixed(2)}g)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Template
            </span>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input">
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Quote
              <button
                type="button"
                onClick={shuffleQuote}
                className="flex items-center gap-1 text-gold-500 hover:text-gold-300"
              >
                <Shuffle size={12} /> Shuffle
              </button>
            </span>
            <div className="input flex items-center bg-ink-900/60 text-xs italic text-[#c9bd9e]">"{quote}"</div>
          </label>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
            Message Preview
          </span>
          <pre className="whitespace-pre-wrap rounded-lg border border-gold-900/40 bg-ink-900/60 p-3 font-mono text-xs leading-relaxed text-[#ece6d9]">
            {message}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">
            2. Select Recipients ({selectedIds.size} selected)
          </h2>
          <div className="flex gap-2">
            <button
              onClick={selectAllFiltered}
              className="rounded-lg border border-gold-900/40 px-3 py-1.5 text-xs font-medium text-ink-500 hover:text-gold-300"
            >
              Select All Shown
            </button>
            <button
              onClick={clearSelection}
              className="rounded-lg border border-gold-900/40 px-3 py-1.5 text-xs font-medium text-ink-500 hover:text-gold-300"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-gold-900/50 bg-ink-900/50 px-3 sm:max-w-sm">
            <Search size={16} className="text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full bg-transparent py-2.5 text-sm text-[#ece6d9] outline-none placeholder:text-ink-600"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(["All", ...allTags] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(t)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    tagFilter === t
                      ? "border-gold-600 bg-gold-500/15 text-gold-300"
                      : "border-gold-900/40 text-ink-500 hover:border-gold-800 hover:text-gold-300"
                  }`}
                >
                  <Tag size={11} /> {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-gold-900/30">
          {filteredCustomers.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-500">
              No customers found. Add customers in the Customers tab first.
            </p>
          ) : (
            filteredCustomers.map((c) => {
              const checked = selectedIds.has(c.id);
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSelected(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleSelected(c.id);
                  }}
                  className="flex cursor-pointer items-center gap-3 border-b border-gold-900/10 px-4 py-2.5 last:border-0 hover:bg-ink-800/30"
                >
                  {checked ? (
                    <CheckCircle2 size={17} className="shrink-0 text-gold-400" />
                  ) : (
                    <Circle size={17} className="shrink-0 text-ink-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#ece6d9]">{c.name}</div>
                    <div className="text-xs text-ink-500">{c.phone}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[10px] text-gold-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={handleCreateCampaign}
          disabled={selectedIds.size === 0}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 py-3 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 hover:from-gold-500 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Radio size={16} /> Create Broadcast Queue ({selectedIds.size})
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-500">
          WhatsApp doesn't allow one-click bulk sending from a browser — this creates a send queue where you
          tap each customer to open a pre-filled chat, hit send in WhatsApp, then mark it sent here.
        </p>
      </div>

      {openCampaign && (
        <CampaignQueue campaign={openCampaign} customers={customers} onClose={() => setOpenCampaignId(null)} />
      )}

      <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">Past Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-ink-500">No campaigns yet.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold-900/25 bg-ink-900/30 px-4 py-3"
              >
                <div>
                  <div className="font-medium text-[#ece6d9]">{c.name}</div>
                  <div className="text-xs text-ink-500">
                    {formatDateTime(c.createdAt)} · {c.sentCustomerIds.length}/{c.customerIds.length} sent
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpenCampaignId(c.id)}
                    className="rounded-lg border border-gold-900/40 px-3 py-1.5 text-xs font-medium text-ink-500 hover:text-gold-300"
                  >
                    Open Queue
                  </button>
                  <button
                    onClick={() => setConfirmDeleteCampaign(c)}
                    className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-rose-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDeleteCampaign && (
        <ConfirmDialog
          title="Delete Campaign"
          message={`Delete the campaign "${confirmDeleteCampaign.name}"? This only removes the tracker, not any messages already sent.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDeleteCampaign(null)}
          onConfirm={() => {
            if (openCampaignId === confirmDeleteCampaign.id) setOpenCampaignId(null);
            removeCampaign(confirmDeleteCampaign.id);
            setConfirmDeleteCampaign(null);
          }}
        />
      )}
    </div>
  );
}

function CampaignQueue({
  campaign,
  customers,
  onClose,
}: {
  campaign: Campaign;
  customers: Customer[];
  onClose: () => void;
}) {
  const markSent = useMarketingStore((s) => s.markSent);
  const unmarkSent = useMarketingStore((s) => s.unmarkSent);

  const recipients = campaign.customerIds
    .map((id) => customers.find((c) => c.id === id))
    .filter((c): c is Customer => Boolean(c));

  const sentCount = campaign.sentCustomerIds.length;
  const total = campaign.customerIds.length;
  const progress = total > 0 ? Math.round((sentCount / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gold-700/50 bg-gradient-to-br from-gold-900/20 to-ink-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-gold-100">{campaign.name}</h2>
          <p className="text-xs text-ink-500">
            {sentCount} of {total} sent
          </p>
        </div>
        <button onClick={onClose} className="text-ink-500 hover:text-gold-300">
          <X size={18} />
        </button>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-ink-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {recipients.map((c) => {
          const sent = campaign.sentCustomerIds.includes(c.id);
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 ${
                sent ? "border-emerald-800/40 bg-emerald-950/20" : "border-gold-900/30 bg-ink-900/40"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[#ece6d9]">{c.name}</div>
                <div className="text-xs text-ink-500">{c.phone}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => openWhatsApp(c.phone, campaign.message)}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:from-emerald-500 hover:to-emerald-400"
                >
                  <Send size={12} /> Send
                </button>
                <button
                  onClick={() => (sent ? unmarkSent(campaign.id, c.id) : markSent(campaign.id, c.id))}
                  title={sent ? "Mark as not sent" : "Mark as sent"}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    sent
                      ? "border-emerald-700 bg-emerald-500/15 text-emerald-400"
                      : "border-gold-900/40 text-ink-500 hover:text-gold-300"
                  }`}
                >
                  <Check size={12} /> {sent ? "Sent" : "Mark Sent"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const templates = useMarketingStore((s) => s.templates);
  const addTemplate = useMarketingStore((s) => s.addTemplate);
  const updateTemplate = useMarketingStore((s) => s.updateTemplate);
  const removeTemplate = useMarketingStore((s) => s.removeTemplate);
  const quotes = useMarketingStore((s) => s.quotes);
  const addQuote = useMarketingStore((s) => s.addQuote);
  const removeQuote = useMarketingStore((s) => s.removeQuote);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MessageTemplate | null>(null);
  const [newQuote, setNewQuote] = useState("");

  function handleSubmit(input: TemplateInput) {
    if (editing) updateTemplate(editing.id, input);
    else addTemplate(input);
    setShowForm(false);
    setEditing(null);
  }

  function handleAddQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuote.trim()) return;
    addQuote(newQuote);
    setNewQuote("");
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">Message Templates</h2>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
          >
            <Plus size={13} /> New Template
          </button>
        </div>
        <p className="mb-3 text-[11px] text-ink-500">
          Placeholders: {"{shopName} {itemName} {category} {grossWeight} {rate} {price} {quote} {customerName} {shopAddress} {shopPhone}"}
        </p>
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-gold-900/30 bg-ink-900/30 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-medium text-gold-300">{t.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(t);
                      setShowForm(true);
                    }}
                    className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-gold-300"
                  >
                    <Pencil size={13} />
                  </button>
                  {templates.length > 1 && (
                    <button
                      onClick={() => setConfirmDelete(t)}
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-500">{t.body}</pre>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">
          Motivational Quotes Library
        </h2>
        <form onSubmit={handleAddQuote} className="mb-4 flex gap-2">
          <input
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder="Add a new quote..."
            className="input flex-1"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 text-xs font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
          >
            <Plus size={14} /> Add
          </button>
        </form>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {quotes.map((q) => (
            <div
              key={q}
              className="flex items-center justify-between gap-3 rounded-lg border border-gold-900/25 bg-ink-900/30 px-3 py-2 text-sm italic text-[#c9bd9e]"
            >
              <span>"{q}"</span>
              <button
                onClick={() => removeQuote(q)}
                className="shrink-0 rounded-md p-1 text-ink-500 hover:bg-ink-800 hover:text-rose-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <TemplateFormModal
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Template"
          message={`Delete the "${confirmDelete.name}" template?`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            removeTemplate(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateFormModal({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: MessageTemplate | null;
  onCancel: () => void;
  onSubmit: (input: TemplateInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    onSubmit({ name: name.trim(), body });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise w-full max-w-lg rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-gold-100">
            {initial ? "Edit Template" : "New Template"}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Template Name
            </span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Message Body
            </span>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="input resize-none font-mono text-xs leading-relaxed"
            />
          </label>
          <p className="text-[11px] text-ink-500">
            Placeholders: {"{shopName} {itemName} {category} {grossWeight} {rate} {price} {quote} {customerName} {shopAddress} {shopPhone}"}
          </p>
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
            {initial ? "Save Changes" : "Add Template"}
          </button>
        </div>
      </form>
    </div>
  );
}
