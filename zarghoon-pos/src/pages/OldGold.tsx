import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Scale,
  Coins,
  FlaskConical,
  Undo2,
  Printer,
  CalendarClock,
  Archive,
} from "lucide-react";
import {
  useOldGoldStore,
  computeOldGold,
  type OldGoldEntry,
  type OldGoldFormInput,
} from "../store/oldGoldStore";
import { categories as allCategories, type Category } from "../store/inventoryStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatMoney, formatDateTime, formatDate, todayKey } from "../lib/format";
import StatCard from "../components/StatCard";

const categoryTabs: (Category | "All")[] = ["All", ...allCategories];

const KARAT_PRESETS = [
  { label: "18K", value: 0.75 },
  { label: "21K", value: 0.875 },
  { label: "22K", value: 0.916 },
  { label: "24K", value: 0.999 },
];

const emptyForm: OldGoldFormInput = {
  category: "Ring",
  quality: "",
  netWeightGrams: 0,
  kaat: 0.875,
  goldRate: 0,
  customerName: "",
  customerPhone: "",
};

type Tab = "stock" | "reports";

export default function OldGold() {
  const [tab, setTab] = useState<Tab>("stock");

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">Old Gold</h1>
          <p className="text-sm text-ink-500">Buy, melt and report old gold received from customers</p>
        </div>
        <div className="flex gap-2 rounded-lg border border-gold-900/40 bg-ink-900/50 p-1">
          <button
            onClick={() => setTab("stock")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === "stock" ? "bg-gold-500/15 text-gold-300" : "text-ink-500 hover:text-gold-300"
            }`}
          >
            Old Gold Stock
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === "reports" ? "bg-gold-500/15 text-gold-300" : "text-ink-500 hover:text-gold-300"
            }`}
          >
            Melt Reports
          </button>
        </div>
      </div>

      {tab === "stock" ? <StockView /> : <ReportsView />}
    </div>
  );
}

function StockView() {
  const entries = useOldGoldStore((s) => s.entries);
  const addEntry = useOldGoldStore((s) => s.addEntry);
  const updateEntry = useOldGoldStore((s) => s.updateEntry);
  const removeEntry = useOldGoldStore((s) => s.removeEntry);
  const meltEntry = useOldGoldStore((s) => s.meltEntry);
  const returnEntry = useOldGoldStore((s) => s.returnEntry);
  const currency = useSettingsStore((s) => s.currency);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OldGoldEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OldGoldEntry | null>(null);
  const [meltingEntry, setMeltingEntry] = useState<OldGoldEntry | null>(null);
  const [returningEntry, setReturningEntry] = useState<OldGoldEntry | null>(null);

  const pending = useMemo(() => entries.filter((e) => e.status === "Pending"), [entries]);

  const filtered = useMemo(
    () =>
      pending.filter((e) => {
        const matchesCategory = category === "All" || e.category === category;
        const matchesSearch =
          !search ||
          e.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
          e.customerName.toLowerCase().includes(search.toLowerCase()) ||
          e.quality.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [pending, category, search]
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, e) => ({
          netWeight: acc.netWeight + e.netWeightGrams,
          estimatePure: acc.estimatePure + e.estimatePureGrams,
          buyPriceCash: acc.buyPriceCash + e.buyPriceCash,
        }),
        { netWeight: 0, estimatePure: 0, buyPriceCash: 0 }
      ),
    [filtered]
  );

  function handleSubmit(form: OldGoldFormInput) {
    if (editing) updateEntry(editing.id, form);
    else addEntry(form);
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 hover:from-gold-500 hover:to-gold-400"
        >
          <Plus size={16} /> Add Old Gold
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Entries" value={String(filtered.length)} icon={Archive} hint={category === "All" ? "All categories" : category} />
        <StatCard label="Total Net Weight" value={`${totals.netWeight.toFixed(2)} g`} icon={Scale} accent />
        <StatCard label="Total Estimate Pure" value={`${totals.estimatePure.toFixed(2)} g`} icon={FlaskConical} accent hint="Pure gold owed" />
        <StatCard label="Total Buy Price Cash" value={formatMoney(totals.buyPriceCash, currency)} icon={Coins} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-gold-900/50 bg-ink-900/50 px-3 sm:max-w-sm">
          <Search size={16} className="text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search voucher, customer, quality..."
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
              <th className="px-4 py-3 font-medium">Voucher</th>
              <th className="px-4 py-3 font-medium">Category / Quality</th>
              <th className="px-4 py-3 font-medium">Net Wt</th>
              <th className="px-4 py-3 font-medium">Kaat</th>
              <th className="px-4 py-3 font-medium">Rate/g</th>
              <th className="px-4 py-3 font-medium">Buy Price Cash</th>
              <th className="px-4 py-3 font-medium">Buy Price Gold</th>
              <th className="px-4 py-3 font-medium">Est. Pure</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-gold-900/10 last:border-0 hover:bg-ink-800/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-gold-300">{e.voucherNo}</div>
                  <div className="text-[11px] text-ink-500">{e.customerName || "Walk-in"}</div>
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {e.category}
                  <div className="text-[11px] text-ink-600">{e.quality || "—"}</div>
                </td>
                <td className="px-4 py-3 text-ink-500">{e.netWeightGrams} g</td>
                <td className="px-4 py-3 text-ink-500">{e.kaat}</td>
                <td className="px-4 py-3 text-ink-500">{formatMoney(e.goldRate, currency)}</td>
                <td className="px-4 py-3 font-medium text-gold-300">{formatMoney(e.buyPriceCash, currency)}</td>
                <td className="px-4 py-3 text-ink-500">{e.buyPriceGold.toFixed(3)} g</td>
                <td className="px-4 py-3 text-ink-500">{e.estimatePureGrams.toFixed(3)} g</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setMeltingEntry(e)}
                      title="Melt"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-amber-400"
                    >
                      <FlaskConical size={14} />
                    </button>
                    <button
                      onClick={() => setReturningEntry(e)}
                      title="Return to customer"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-sky-400"
                    >
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(e);
                        setShowForm(true);
                      }}
                      title="Edit"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-gold-300"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(e)}
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
                <td colSpan={9} className="px-4 py-10 text-center text-ink-500">
                  No old gold entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <EntryFormModal
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {meltingEntry && (
        <MeltModal
          entry={meltingEntry}
          currency={currency}
          onCancel={() => setMeltingEntry(null)}
          onConfirm={(actualPureGrams) => {
            meltEntry(meltingEntry.id, actualPureGrams);
            setMeltingEntry(null);
          }}
        />
      )}

      {returningEntry && (
        <ConfirmModal
          title="Return to Customer"
          message={`Mark ${returningEntry.voucherNo} as returned to the customer? This closes the entry without melting.`}
          confirmLabel="Return Item"
          confirmClass="bg-sky-600/90 hover:bg-sky-600"
          onCancel={() => setReturningEntry(null)}
          onConfirm={() => {
            returnEntry(returningEntry.id);
            setReturningEntry(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Entry"
          message={`Are you sure you want to delete ${confirmDelete.voucherNo}? This cannot be undone.`}
          confirmLabel="Delete"
          confirmClass="bg-rose-600/90 hover:bg-rose-600"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            removeEntry(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClass,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="animate-rise w-full max-w-sm rounded-2xl border border-gold-900/40 bg-ink-950 p-6">
        <h3 className="font-serif text-lg font-semibold text-gold-100">{title}</h3>
        <p className="mt-2 text-sm text-ink-500">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gold-900/50 py-2 text-sm text-[#c9bd9e] hover:border-gold-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MeltModal({
  entry,
  currency,
  onCancel,
  onConfirm,
}: {
  entry: OldGoldEntry;
  currency: string;
  onCancel: () => void;
  onConfirm: (actualPureGrams: number) => void;
}) {
  const [actualPure, setActualPure] = useState(entry.estimatePureGrams.toFixed(3));
  const actualValue = Number(actualPure) || 0;
  const variance = actualValue - entry.estimatePureGrams;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(actualValue);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise w-full max-w-md rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-gold-100">
            <FlaskConical size={18} className="text-amber-400" /> Melt {entry.voucherNo}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-gold-900/40 bg-ink-900/40 p-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-500">Net Weight</div>
              <div className="font-medium text-[#ece6d9]">{entry.netWeightGrams} g</div>
            </div>
            <div className="rounded-lg border border-gold-900/40 bg-ink-900/40 p-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-500">Estimated Pure</div>
              <div className="font-medium text-[#ece6d9]">{entry.estimatePureGrams.toFixed(3)} g</div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Actual Pure Weight After Melting (grams)
            </span>
            <input
              type="number"
              min={0}
              step={0.001}
              autoFocus
              value={actualPure}
              onChange={(e) => setActualPure(e.target.value)}
              className="input"
            />
          </label>

          <div
            className={`rounded-lg border px-4 py-2.5 text-sm ${
              variance === 0
                ? "border-gold-900/40 bg-ink-900/40 text-ink-500"
                : variance > 0
                ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-400"
                : "border-rose-800/40 bg-rose-950/30 text-rose-400"
            }`}
          >
            Variance vs estimate: {variance >= 0 ? "+" : ""}
            {variance.toFixed(3)} g
          </div>

          <p className="text-[11px] text-ink-500">
            Buy price paid: {formatMoney(entry.buyPriceCash, currency)}. Confirming will close this voucher —
            it can no longer be edited.
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
            className="flex-1 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 text-sm font-semibold text-ink-950 hover:from-amber-500 hover:to-amber-400"
          >
            Confirm Melt &amp; Close
          </button>
        </div>
      </form>
    </div>
  );
}

function EntryFormModal({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: OldGoldEntry | null;
  onCancel: () => void;
  onSubmit: (form: OldGoldFormInput) => void;
}) {
  const k21 = useGoldRateStore((s) => s.k21);
  const currency = useSettingsStore((s) => s.currency);
  const [form, setForm] = useState<OldGoldFormInput>(
    initial
      ? {
          category: initial.category,
          quality: initial.quality,
          netWeightGrams: initial.netWeightGrams,
          kaat: initial.kaat,
          goldRate: initial.goldRate,
          customerName: initial.customerName,
          customerPhone: initial.customerPhone,
        }
      : { ...emptyForm, goldRate: k21 }
  );

  function update<K extends keyof OldGoldFormInput>(key: K, value: OldGoldFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const calc = computeOldGold(form.netWeightGrams, form.kaat, form.goldRate);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.netWeightGrams <= 0 || form.kaat <= 0 || form.goldRate <= 0) return;
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
            {initial ? "Edit Old Gold Entry" : "Add Old Gold"}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Category
              </span>
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
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Quality
              </span>
              <input
                value={form.quality}
                onChange={(e) => update("quality", e.target.value)}
                placeholder="e.g. Tested, Broken, Mixed"
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Net Weight (grams)
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                required
                value={form.netWeightGrams || ""}
                onChange={(e) => update("netWeightGrams", Number(e.target.value) || 0)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Gold Rate / gram
              </span>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={form.goldRate || ""}
                onChange={(e) => update("goldRate", Number(e.target.value) || 0)}
                className="input"
              />
            </label>

            <div className="col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Kaat (purity, e.g. 0.875 for 21K)
              </span>
              <div className="mb-2 flex gap-2">
                {KARAT_PRESETS.map((k) => (
                  <button
                    type="button"
                    key={k.label}
                    onClick={() => update("kaat", k.value)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                      form.kaat === k.value
                        ? "border-gold-600 bg-gold-500/15 text-gold-300"
                        : "border-gold-900/40 text-ink-500 hover:text-gold-300"
                    }`}
                  >
                    {k.label} ({k.value})
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                max={1}
                step={0.001}
                required
                value={form.kaat || ""}
                onChange={(e) => update("kaat", Number(e.target.value) || 0)}
                className="input"
              />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Customer Name
              </span>
              <input
                value={form.customerName}
                onChange={(e) => update("customerName", e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Customer Phone
              </span>
              <input
                value={form.customerPhone}
                onChange={(e) => update("customerPhone", e.target.value)}
                className="input"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-gold-900/40 bg-ink-900/40 py-2">
              <div className="text-[10px] uppercase tracking-wider text-ink-500">Buy Price Cash</div>
              <div className="text-sm font-semibold text-gold-300">
                {form.goldRate > 0 ? formatMoney(calc.buyPriceCash, currency) : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-gold-900/40 bg-ink-900/40 py-2">
              <div className="text-[10px] uppercase tracking-wider text-ink-500">Buy Price Gold</div>
              <div className="text-sm font-semibold text-gold-300">{calc.buyPriceGold.toFixed(3)} g</div>
            </div>
            <div className="rounded-lg border border-gold-900/40 bg-ink-900/40 py-2">
              <div className="text-[10px] uppercase tracking-wider text-ink-500">Estimate Pure</div>
              <div className="text-sm font-semibold text-gold-300">{calc.estimatePureGrams.toFixed(3)} g</div>
            </div>
          </div>
          <p className="-mt-2 text-center text-[11px] text-ink-500">
            {form.netWeightGrams || 0}g × {form.kaat || 0} × rate = Buy Price Cash · ÷ rate = Estimate Pure
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
            {initial ? "Save Changes" : "Add Old Gold"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReportsView() {
  const entries = useOldGoldStore((s) => s.entries);
  const shop = useSettingsStore();
  const currency = useSettingsStore((s) => s.currency);
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [printingEntry, setPrintingEntry] = useState<OldGoldEntry | null>(null);
  const [showReport, setShowReport] = useState(false);

  const isToday = fromDate === todayKey() && toDate === todayKey();

  const closed = useMemo(
    () =>
      entries.filter((e) => {
        if (e.status === "Pending" || !e.closedAt) return false;
        const day = e.closedAt.slice(0, 10);
        return day >= fromDate && day <= toDate;
      }),
    [entries, fromDate, toDate]
  );

  const totals = useMemo(
    () =>
      closed.reduce(
        (acc, e) => ({
          estimatePure: acc.estimatePure + e.estimatePureGrams,
          actualPure: acc.actualPure + (e.actualPureGrams ?? 0),
          buyPriceCash: acc.buyPriceCash + e.buyPriceCash,
        }),
        { estimatePure: 0, actualPure: 0, buyPriceCash: 0 }
      ),
    [closed]
  );

  function resetToToday() {
    setFromDate(todayKey());
    setToDate(todayKey());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {closed.length} closed voucher{closed.length === 1 ? "" : "s"} ·{" "}
          {isToday ? "Today" : `${fromDate} → ${toDate}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetToToday}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              isToday
                ? "border-gold-600 bg-gold-500/15 text-gold-300"
                : "border-gold-900/40 text-ink-500 hover:text-gold-300"
            }`}
          >
            <CalendarClock size={14} /> Today
          </button>
          <label className="flex items-center gap-1.5 rounded-lg border border-gold-900/40 bg-ink-900/50 px-3 py-2 text-xs text-ink-500">
            From
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-[#ece6d9] outline-none [color-scheme:dark]"
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-lg border border-gold-900/40 bg-ink-900/50 px-3 py-2 text-xs text-ink-500">
            To
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={todayKey()}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-[#ece6d9] outline-none [color-scheme:dark]"
            />
          </label>
          <button
            onClick={() => setShowReport(true)}
            disabled={closed.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-3 py-2 text-xs font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Closed Vouchers" value={String(closed.length)} icon={Archive} />
        <StatCard label="Estimated Pure" value={`${totals.estimatePure.toFixed(2)} g`} icon={FlaskConical} />
        <StatCard label="Actual Pure (Melted)" value={`${totals.actualPure.toFixed(2)} g`} icon={FlaskConical} accent />
        <StatCard label="Total Buy Price Cash" value={formatMoney(totals.buyPriceCash, currency)} icon={Coins} accent />
      </div>

      {closed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gold-900/25 bg-ink-900/40 py-16">
          <FlaskConical size={32} className="mb-3 text-ink-600" />
          <p className="text-sm text-ink-500">No melted or returned entries for this period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gold-900/25 bg-ink-900/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold-900/30 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-medium">Voucher</th>
                <th className="px-4 py-3 font-medium">Closed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Net Wt</th>
                <th className="px-4 py-3 font-medium">Est. Pure</th>
                <th className="px-4 py-3 font-medium">Actual Pure</th>
                <th className="px-4 py-3 font-medium">Variance</th>
                <th className="px-4 py-3 font-medium">Buy Price Cash</th>
                <th className="px-4 py-3 text-right font-medium">Print</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((e) => (
                <tr key={e.id} className="border-b border-gold-900/10 last:border-0 hover:bg-ink-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gold-300">{e.voucherNo}</div>
                    <div className="text-[11px] text-ink-500">{e.customerName || "Walk-in"}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{e.closedAt && formatDateTime(e.closedAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === "Melted"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-sky-500/10 text-sky-400"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{e.category}</td>
                  <td className="px-4 py-3 text-ink-500">{e.netWeightGrams} g</td>
                  <td className="px-4 py-3 text-ink-500">{e.estimatePureGrams.toFixed(3)} g</td>
                  <td className="px-4 py-3 text-ink-500">
                    {e.actualPureGrams !== undefined ? `${e.actualPureGrams.toFixed(3)} g` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {e.meltVarianceGrams !== undefined ? (
                      <span className={e.meltVarianceGrams >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {e.meltVarianceGrams >= 0 ? "+" : ""}
                        {e.meltVarianceGrams.toFixed(3)} g
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gold-300">{formatMoney(e.buyPriceCash, currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setPrintingEntry(e)}
                      title="Print"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-gold-300"
                    >
                      <Printer size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {printingEntry && (
        <OldGoldReportModal entry={printingEntry} shop={shop} currency={currency} onClose={() => setPrintingEntry(null)} />
      )}

      {showReport && (
        <OldGoldSummaryReportModal
          entries={closed}
          totals={totals}
          rangeLabel={isToday ? "Today" : `${formatDate(fromDate)} — ${formatDate(toDate)}`}
          shop={shop}
          currency={currency}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function OldGoldReportModal({
  entry,
  shop,
  currency,
  onClose,
}: {
  entry: OldGoldEntry;
  shop: { shopName: string; shopTagline: string; shopAddress: string; shopPhone: string };
  currency: string;
  onClose: () => void;
}) {
  const isMelted = entry.status === "Melted";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="animate-rise my-4 w-full max-w-3xl print:my-0 print:max-w-none">
        <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-gold-800/50 bg-ink-950 px-5 py-4 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-gold-100">{entry.voucherNo}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-gold-800/50 px-3 py-2 text-sm font-medium text-[#c9bd9e] hover:border-gold-600"
            >
              <Printer size={15} /> Print
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
              <h2 className="text-xl font-bold tracking-wide text-neutral-900">
                {isMelted ? "OLD GOLD MELT REPORT" : "OLD GOLD RETURN RECEIPT"}
              </h2>
              <p className="text-xs text-neutral-600">Voucher #: {entry.voucherNo}</p>
              <p className="text-xs text-neutral-600">Received: {formatDateTime(entry.createdAt)}</p>
              {entry.closedAt && (
                <p className="text-xs text-neutral-600">
                  {isMelted ? "Melted" : "Returned"}: {formatDateTime(entry.closedAt)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-between text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Customer</p>
              <p className="font-medium">{entry.customerName || "Walk-in Customer"}</p>
              {entry.customerPhone && <p className="text-neutral-600">{entry.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Status</p>
              <p className="font-medium">{entry.status}</p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Quality</th>
                <th className="py-2 pr-2 text-right">Net Wt</th>
                <th className="py-2 pr-2 text-right">Kaat</th>
                <th className="py-2 pr-2 text-right">Rate/g</th>
                <th className="py-2 pr-2 text-right">Buy Price Cash</th>
                <th className="py-2 pl-2 text-right">Estimate Pure</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200">
                <td className="py-2 pr-2">{entry.category}</td>
                <td className="py-2 pr-2 text-neutral-600">{entry.quality || "—"}</td>
                <td className="py-2 pr-2 text-right text-neutral-600">{entry.netWeightGrams}g</td>
                <td className="py-2 pr-2 text-right text-neutral-600">{entry.kaat}</td>
                <td className="py-2 pr-2 text-right text-neutral-600">{formatMoney(entry.goldRate, currency)}</td>
                <td className="py-2 pr-2 text-right font-medium">{formatMoney(entry.buyPriceCash, currency)}</td>
                <td className="py-2 pl-2 text-right text-neutral-600">{entry.estimatePureGrams.toFixed(3)}g</td>
              </tr>
            </tbody>
          </table>

          {isMelted && (
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Estimated Pure</span>
                  <span>{entry.estimatePureGrams.toFixed(3)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Actual Pure After Melting</span>
                  <span>{entry.actualPureGrams?.toFixed(3)} g</span>
                </div>
                <div className="flex justify-between border-t-2 border-neutral-900 pt-1.5 text-base font-bold">
                  <span>Variance</span>
                  <span>
                    {(entry.meltVarianceGrams ?? 0) >= 0 ? "+" : ""}
                    {entry.meltVarianceGrams?.toFixed(3)} g
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-16 flex items-end justify-between text-[11px] text-neutral-500">
            <div className="max-w-xs">
              <p>{shop.shopName} — old gold {isMelted ? "melt report" : "return receipt"}.</p>
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

function OldGoldSummaryReportModal({
  entries,
  totals,
  rangeLabel,
  shop,
  currency,
  onClose,
}: {
  entries: OldGoldEntry[];
  totals: { estimatePure: number; actualPure: number; buyPriceCash: number };
  rangeLabel: string;
  shop: { shopName: string; shopTagline: string; shopAddress: string; shopPhone: string };
  currency: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="animate-rise my-4 w-full max-w-4xl print:my-0 print:max-w-none">
        <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-gold-800/50 bg-ink-950 px-5 py-4 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-gold-100">Melt Report — {rangeLabel}</h3>
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
              <h2 className="text-xl font-bold tracking-wide text-neutral-900">OLD GOLD REPORT</h2>
              <p className="text-xs text-neutral-600">Period: {rangeLabel}</p>
              <p className="text-xs text-neutral-600">Generated: {formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Vouchers</p>
              <p className="font-semibold">{entries.length}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Estimated Pure</p>
              <p className="font-semibold">{totals.estimatePure.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Actual Pure</p>
              <p className="font-semibold">{totals.actualPure.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Total Buy Price Cash</p>
              <p className="font-semibold">{formatMoney(totals.buyPriceCash, currency)}</p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Voucher</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2 text-right">Net Wt</th>
                <th className="py-2 pr-2 text-right">Est. Pure</th>
                <th className="py-2 pr-2 text-right">Actual Pure</th>
                <th className="py-2 pl-2 text-right">Buy Price Cash</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className="border-b border-neutral-200">
                  <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                  <td className="py-2 pr-2 font-medium">{e.voucherNo}</td>
                  <td className="py-2 pr-2 text-neutral-600">{e.status}</td>
                  <td className="py-2 pr-2 text-neutral-600">{e.category}</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{e.netWeightGrams}g</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{e.estimatePureGrams.toFixed(3)}g</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">
                    {e.actualPureGrams !== undefined ? `${e.actualPureGrams.toFixed(3)}g` : "—"}
                  </td>
                  <td className="py-2 pl-2 text-right font-medium">{formatMoney(e.buyPriceCash, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-900 text-sm font-bold">
                <td colSpan={5} />
                <td className="py-2 pr-2 text-right">{totals.estimatePure.toFixed(3)}g</td>
                <td className="py-2 pr-2 text-right">{totals.actualPure.toFixed(3)}g</td>
                <td className="py-2 pl-2 text-right">{formatMoney(totals.buyPriceCash, currency)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-16 text-[11px] text-neutral-500">
            <p>{shop.shopName} — old gold report generated from the private POS system.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
