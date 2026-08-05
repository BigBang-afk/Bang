import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Lock,
  LockOpen,
  Printer,
  CalendarClock,
  Archive,
} from "lucide-react";
import {
  useCashBookStore,
  isDayClosed,
  openingBalanceForDate,
  type CashEntry,
  type CashEntryInput,
  type CashEntryType,
  type DayClosing,
} from "../store/cashBookStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatMoney, formatDate, formatDateTime, todayKey } from "../lib/format";
import StatCard from "../components/StatCard";
import ConfirmDialog from "../components/ConfirmDialog";

export default function DailyCash() {
  const entries = useCashBookStore((s) => s.entries);
  const closings = useCashBookStore((s) => s.closings);
  const addEntry = useCashBookStore((s) => s.addEntry);
  const updateEntry = useCashBookStore((s) => s.updateEntry);
  const removeEntry = useCashBookStore((s) => s.removeEntry);
  const closeDay = useCashBookStore((s) => s.closeDay);
  const reopenDay = useCashBookStore((s) => s.reopenDay);
  const currency = useSettingsStore((s) => s.currency);
  const shop = useSettingsStore();

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [addType, setAddType] = useState<CashEntryType | null>(null);
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<CashEntry | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [printingClosing, setPrintingClosing] = useState<DayClosing | null>(null);

  const isToday = selectedDate === todayKey();

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === selectedDate),
    [entries, selectedDate]
  );

  const totalIn = useMemo(
    () => dayEntries.filter((e) => e.type === "In").reduce((s, e) => s + e.amount, 0),
    [dayEntries]
  );
  const totalOut = useMemo(
    () => dayEntries.filter((e) => e.type === "Out").reduce((s, e) => s + e.amount, 0),
    [dayEntries]
  );

  const closedRecord = closings.find((c) => c.date === selectedDate) ?? null;
  const closed = isDayClosed(closings, selectedDate);
  const openingBalance = closedRecord ? closedRecord.openingBalance : openingBalanceForDate(closings, selectedDate);
  const closingBalance = closedRecord ? closedRecord.closingBalance : openingBalance + totalIn - totalOut;

  const sortedClosings = useMemo(
    () => [...closings].sort((a, b) => b.date.localeCompare(a.date)),
    [closings]
  );

  function handleSaveEntry(input: CashEntryInput) {
    if (editingEntry) updateEntry(editingEntry.id, input);
    else addEntry(selectedDate, input);
    setAddType(null);
    setEditingEntry(null);
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">Daily Cash</h1>
          <p className="text-sm text-ink-500">Track cash in / out and close the day's book</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedDate(todayKey())}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              isToday
                ? "border-gold-600 bg-gold-500/15 text-gold-300"
                : "border-gold-900/40 text-ink-500 hover:text-gold-300"
            }`}
          >
            <CalendarClock size={14} /> Today
          </button>
          <label className="flex items-center gap-1.5 rounded-lg border border-gold-900/40 bg-ink-900/50 px-3 py-2 text-xs text-ink-500">
            Date
            <input
              type="date"
              value={selectedDate}
              max={todayKey()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-[#ece6d9] outline-none [color-scheme:dark]"
            />
          </label>
          <button
            onClick={() => setShowReport(true)}
            disabled={dayEntries.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-3 py-2 text-xs font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-gold-900/25 bg-ink-900/40 px-4 py-3">
        {closed ? (
          <>
            <Lock size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-400">
              Day closed {closedRecord && `at ${formatDateTime(closedRecord.closedAt)}`}
            </span>
            <button
              onClick={() => setConfirmReopen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-gold-900/40 px-3 py-1.5 text-xs font-medium text-ink-500 hover:border-gold-700 hover:text-gold-300"
            >
              <LockOpen size={14} /> Reopen Day
            </button>
          </>
        ) : (
          <>
            <LockOpen size={16} className="text-amber-400" />
            <span className="text-sm text-amber-400">Day open — entries can be added and edited</span>
            <button
              onClick={() => setConfirmClose(true)}
              disabled={dayEntries.length === 0}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-emerald-800/50 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Lock size={14} /> Close Day
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Opening Balance" value={formatMoney(openingBalance, currency)} icon={Wallet} />
        <StatCard label="Cash In" value={formatMoney(totalIn, currency)} icon={ArrowDownCircle} accent />
        <StatCard label="Cash Out" value={formatMoney(totalOut, currency)} icon={ArrowUpCircle} />
        <StatCard label="Closing Balance" value={formatMoney(closingBalance, currency)} icon={Banknote} accent />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAddType("In")}
          disabled={closed}
          className="flex items-center gap-2 rounded-lg border border-emerald-800/50 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-950/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} /> Cash In
        </button>
        <button
          onClick={() => setAddType("Out")}
          disabled={closed}
          className="flex items-center gap-2 rounded-lg border border-rose-800/50 px-4 py-2.5 text-sm font-semibold text-rose-400 transition hover:bg-rose-950/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} /> Cash Out
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gold-900/25 bg-ink-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-900/30 text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dayEntries.map((e) => (
              <tr key={e.id} className="border-b border-gold-900/10 last:border-0 hover:bg-ink-800/30">
                <td className="px-4 py-3 text-ink-500">{formatDateTime(e.createdAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.type === "In" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {e.type === "In" ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                    {e.type === "In" ? "Cash In" : "Cash Out"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#c9bd9e]">{e.reason || "—"}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    e.type === "In" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {e.type === "In" ? "+" : "-"}
                  {formatMoney(e.amount, currency)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditingEntry(e)}
                      disabled={closed}
                      title="Edit"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingEntry(e)}
                      disabled={closed}
                      title="Delete"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {dayEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                  No cash entries for this date yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Archive size={16} className="text-gold-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">Closed Days</h2>
        </div>
        {sortedClosings.length === 0 ? (
          <p className="text-sm text-ink-500">No days closed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-900/30 text-left text-xs uppercase tracking-wider text-ink-500">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Opening</th>
                  <th className="py-2 pr-4 font-medium">Cash In</th>
                  <th className="py-2 pr-4 font-medium">Cash Out</th>
                  <th className="py-2 pr-4 font-medium">Closing</th>
                  <th className="py-2 pr-0 text-right font-medium">Print</th>
                </tr>
              </thead>
              <tbody>
                {sortedClosings.map((c) => (
                  <tr key={c.date} className="border-b border-gold-900/10 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gold-300">{formatDate(c.date)}</td>
                    <td className="py-2.5 pr-4 text-ink-500">{formatMoney(c.openingBalance, currency)}</td>
                    <td className="py-2.5 pr-4 text-emerald-400">{formatMoney(c.totalIn, currency)}</td>
                    <td className="py-2.5 pr-4 text-rose-400">{formatMoney(c.totalOut, currency)}</td>
                    <td className="py-2.5 pr-4 font-semibold text-gold-200">{formatMoney(c.closingBalance, currency)}</td>
                    <td className="py-2.5 pr-0 text-right">
                      <button
                        onClick={() => setPrintingClosing(c)}
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
      </div>

      {(addType || editingEntry) && (
        <CashEntryModal
          initial={editingEntry}
          defaultType={editingEntry ? editingEntry.type : addType!}
          onCancel={() => {
            setAddType(null);
            setEditingEntry(null);
          }}
          onSave={handleSaveEntry}
        />
      )}

      {deletingEntry && (
        <ConfirmDialog
          title="Delete Cash Entry"
          message={`Are you sure you want to delete this ${deletingEntry.type === "In" ? "cash in" : "cash out"} entry of ${formatMoney(
            deletingEntry.amount,
            currency
          )}? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingEntry(null)}
          onConfirm={() => {
            removeEntry(deletingEntry.id);
            setDeletingEntry(null);
          }}
        />
      )}

      {confirmClose && (
        <ConfirmDialog
          title="Close Day"
          message={`Close the cash book for ${formatDate(selectedDate)}? Opening ${formatMoney(
            openingBalance,
            currency
          )} + In ${formatMoney(totalIn, currency)} − Out ${formatMoney(totalOut, currency)} = Closing ${formatMoney(
            closingBalance,
            currency
          )}. Entries will be locked.`}
          confirmLabel="Close Day"
          confirmClass="bg-emerald-600/90 hover:bg-emerald-600"
          onCancel={() => setConfirmClose(false)}
          onConfirm={() => {
            closeDay(selectedDate, openingBalance, totalIn, totalOut);
            setConfirmClose(false);
          }}
        />
      )}

      {confirmReopen && (
        <ConfirmDialog
          title="Reopen Day"
          message={`Reopen ${formatDate(selectedDate)}? Entries will become editable again.`}
          confirmLabel="Reopen Day"
          confirmClass="bg-amber-600/90 hover:bg-amber-600"
          onCancel={() => setConfirmReopen(false)}
          onConfirm={() => {
            reopenDay(selectedDate);
            setConfirmReopen(false);
          }}
        />
      )}

      {showReport && (
        <CashReportModal
          date={selectedDate}
          entries={dayEntries}
          openingBalance={openingBalance}
          totalIn={totalIn}
          totalOut={totalOut}
          closingBalance={closingBalance}
          closed={closed}
          shop={shop}
          currency={currency}
          onClose={() => setShowReport(false)}
        />
      )}

      {printingClosing && (
        <CashReportModal
          date={printingClosing.date}
          entries={entries.filter((e) => e.date === printingClosing.date)}
          openingBalance={printingClosing.openingBalance}
          totalIn={printingClosing.totalIn}
          totalOut={printingClosing.totalOut}
          closingBalance={printingClosing.closingBalance}
          closed
          shop={shop}
          currency={currency}
          onClose={() => setPrintingClosing(null)}
        />
      )}
    </div>
  );
}

function CashEntryModal({
  initial,
  defaultType,
  onCancel,
  onSave,
}: {
  initial: CashEntry | null;
  defaultType: CashEntryType;
  onCancel: () => void;
  onSave: (input: CashEntryInput) => void;
}) {
  const [type, setType] = useState<CashEntryType>(initial ? initial.type : defaultType);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [reason, setReason] = useState(initial ? initial.reason : "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount) || 0;
    if (value <= 0) return;
    onSave({ type, amount: value, reason: reason.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise w-full max-w-md rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-gold-100">
            {initial ? "Edit Entry" : type === "In" ? "Add Cash In" : "Add Cash Out"}
          </h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-2 rounded-lg border border-gold-900/40 bg-ink-900/40 p-1">
            <button
              type="button"
              onClick={() => setType("In")}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                type === "In" ? "bg-emerald-500/15 text-emerald-400" : "text-ink-500 hover:text-emerald-300"
              }`}
            >
              Cash In
            </button>
            <button
              type="button"
              onClick={() => setType("Out")}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                type === "Out" ? "bg-rose-500/15 text-rose-400" : "text-ink-500 hover:text-rose-300"
              }`}
            >
              Cash Out
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Amount
            </span>
            <input
              type="number"
              min={0}
              step={1}
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Reason / Note
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Owner withdrawal, Shop expense, Supplier payment"
              className="input"
            />
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
            {initial ? "Save Changes" : "Add Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CashReportModal({
  date,
  entries,
  openingBalance,
  totalIn,
  totalOut,
  closingBalance,
  closed,
  shop,
  currency,
  onClose,
}: {
  date: string;
  entries: CashEntry[];
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  closed: boolean;
  shop: { shopName: string; shopTagline: string; shopAddress: string; shopPhone: string };
  currency: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="animate-rise my-4 w-full max-w-3xl print:my-0 print:max-w-none">
        <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-gold-800/50 bg-ink-950 px-5 py-4 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-gold-100">Cash Book — {formatDate(date)}</h3>
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
              <h2 className="text-xl font-bold tracking-wide text-neutral-900">DAILY CASH BOOK</h2>
              <p className="text-xs text-neutral-600">Date: {formatDate(date)}</p>
              <p className="text-xs text-neutral-600">Status: {closed ? "Closed" : "Open"}</p>
              <p className="text-xs text-neutral-600">Generated: {formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Opening Balance</p>
              <p className="font-semibold">{formatMoney(openingBalance, currency)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Total Cash In</p>
              <p className="font-semibold">{formatMoney(totalIn, currency)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Total Cash Out</p>
              <p className="font-semibold">{formatMoney(totalOut, currency)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Closing Balance</p>
              <p className="font-semibold">{formatMoney(closingBalance, currency)}</p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
                <th className="py-2 pr-2">Time</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Reason</th>
                <th className="py-2 pl-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-500">
                    No entries recorded.
                  </td>
                </tr>
              ) : (
                entries
                  .slice()
                  .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                  .map((e) => (
                    <tr key={e.id} className="border-b border-neutral-200">
                      <td className="py-2 pr-2 text-neutral-600">{formatDateTime(e.createdAt)}</td>
                      <td className="py-2 pr-2">{e.type === "In" ? "Cash In" : "Cash Out"}</td>
                      <td className="py-2 pr-2 text-neutral-600">{e.reason || "—"}</td>
                      <td className="py-2 pl-2 text-right font-medium">
                        {e.type === "In" ? "+" : "-"}
                        {formatMoney(e.amount, currency)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-900 text-sm font-bold">
                <td colSpan={3} className="py-2 pr-2 text-right">
                  Closing Balance
                </td>
                <td className="py-2 pl-2 text-right">{formatMoney(closingBalance, currency)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-16 flex items-end justify-between text-[11px] text-neutral-500">
            <p>{shop.shopName} — daily cash book generated from the private POS system.</p>
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
