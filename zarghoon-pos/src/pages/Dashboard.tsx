import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, TrendingUp, Package, Receipt, AlertTriangle, Pencil, PiggyBank, FlaskConical, Banknote } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import StatCard from "../components/StatCard";
import GoldRateModal from "../components/GoldRateModal";
import ProductThumb from "../components/ProductThumb";
import { useGoldRateStore } from "../store/goldRateStore";
import { useInventoryStore } from "../store/inventoryStore";
import { useSalesStore } from "../store/salesStore";
import { useSettingsStore } from "../store/settingsStore";
import { useCashBookStore, openingBalanceForDate } from "../store/cashBookStore";
import { formatMoney, todayKey, monthKey, formatMonthLabel, formatDate } from "../lib/format";
import { computeProductPrice } from "../lib/pricing";
import { computeProfit } from "../lib/profit";

export default function Dashboard() {
  const navigate = useNavigate();
  const rates = useGoldRateStore();
  const products = useInventoryStore((s) => s.products);
  const sales = useSalesStore((s) => s.sales);
  const cashEntries = useCashBookStore((s) => s.entries);
  const cashClosings = useCashBookStore((s) => s.closings);
  const currency = useSettingsStore((s) => s.currency);
  const shopName = useSettingsStore((s) => s.shopName);
  const [showRateModal, setShowRateModal] = useState(false);

  const today = todayKey();
  const todaysSales = useMemo(
    () => sales.filter((s) => s.date.startsWith(today)),
    [sales, today]
  );
  const todaysRevenue = todaysSales.reduce((sum, s) => sum + s.total, 0);

  const todayClosing = useMemo(
    () => cashClosings.find((c) => c.date === today),
    [cashClosings, today]
  );
  const cashInHand = useMemo(() => {
    if (todayClosing) return todayClosing.closingBalance;
    const opening = openingBalanceForDate(cashClosings, today);
    const todaysCash = cashEntries.filter((e) => e.date === today);
    const totalIn = todaysCash.filter((e) => e.type === "In").reduce((s, e) => s + e.amount, 0);
    const totalOut = todaysCash.filter((e) => e.type === "Out").reduce((s, e) => s + e.amount, 0);
    return opening + totalIn - totalOut;
  }, [todayClosing, cashClosings, cashEntries, today]);

  const currentMonth = monthKey();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonth]);
    sales.forEach((s) => set.add(s.date.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [sales, currentMonth]);

  const monthSales = useMemo(
    () => sales.filter((s) => s.date.slice(0, 7) === selectedMonth),
    [sales, selectedMonth]
  );

  const monthProfit = useMemo(
    () =>
      monthSales.reduce(
        (acc, s) => {
          for (const it of s.items) {
            const p = computeProfit(it);
            acc.cash += p.profitCash;
            acc.gold += p.profitGold;
          }
          return acc;
        },
        { cash: 0, gold: 0 }
      ),
    [monthSales]
  );

  const inStockProducts = useMemo(() => products.filter((p) => p.stock > 0), [products]);

  const inventoryValue = useMemo(
    () =>
      inStockProducts.reduce(
        (sum, p) => sum + computeProductPrice(p, rates).total * p.stock,
        0
      ),
    [inStockProducts, rates]
  );

  const lowStock = inStockProducts.filter((p) => p.stock <= 5);

  const chartData = useMemo(() => {
    const days: { label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const revenue = sales
        .filter((s) => s.date.startsWith(key))
        .reduce((sum, s) => sum + s.total, 0);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        revenue,
      });
    }
    return days;
  }, [sales]);

  const recentSales = sales.slice(0, 5);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold-500/70">
            {formatDate(new Date().toISOString())}
          </p>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">
            Welcome back to {shopName}
          </h1>
        </div>
        <button
          onClick={() => navigate("/pos")}
          className="rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 transition hover:from-gold-500 hover:to-gold-400"
        >
          + New Sale
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <button onClick={() => setShowRateModal(true)} className="text-left">
          <StatCard
            label="21K Gold Rate / g"
            value={formatMoney(rates.k21, currency)}
            icon={Coins}
            accent
            hint="Tap to update today's rate"
          />
        </button>
        <StatCard
          label="Today's Revenue"
          value={formatMoney(todaysRevenue, currency)}
          icon={TrendingUp}
          hint={`${todaysSales.length} sale${todaysSales.length === 1 ? "" : "s"} today`}
        />
        <button onClick={() => navigate("/daily-cash")} className="text-left">
          <StatCard
            label="Cash in Hand"
            value={formatMoney(cashInHand, currency)}
            icon={Banknote}
            accent
            hint={todayClosing ? "Today's day is closed" : "Tap to open Daily Cash"}
          />
        </button>
        <StatCard
          label="Inventory Value"
          value={formatMoney(inventoryValue, currency)}
          icon={Package}
          hint={`${inStockProducts.length} products`}
        />
        <StatCard
          label="Total Sales"
          value={String(sales.length)}
          icon={Receipt}
          hint="All-time invoices"
        />
      </div>

      <div className="rounded-2xl border border-gold-700/50 bg-gradient-to-br from-gold-900/20 to-ink-900 p-5 shadow-[0_0_30px_-12px_rgba(212,175,55,0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PiggyBank size={16} className="text-gold-300" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">Monthly Profit</h2>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-gold-900/50 bg-ink-950 px-3 py-1.5 text-xs text-[#ece6d9] outline-none focus:border-gold-600/60"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
                {m === currentMonth ? " (current)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500">Profit in Cash</div>
            <div className="mt-1 font-serif text-2xl font-semibold text-gold-100">
              {formatMoney(monthProfit.cash, currency)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500">Profit in Gold</div>
            <div className="mt-1 flex items-center gap-2 font-serif text-2xl font-semibold text-gold-100">
              <FlaskConical size={18} className="text-gold-500/70" />
              {monthProfit.gold.toFixed(3)} g
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500">Invoices</div>
            <div className="mt-1 font-serif text-2xl font-semibold text-gold-100">{monthSales.length}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          {selectedMonth === currentMonth
            ? "Resets to zero at the start of each new month."
            : `Viewing ${formatMonthLabel(selectedMonth)} — switch back to ${formatMonthLabel(currentMonth)} for the current month.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">
              Revenue — Last 7 Days
            </h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#221e17" vertical={false} />
                <XAxis dataKey="label" stroke="#4a4032" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4a4032" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#181510",
                    border: "1px solid #332c21",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#f3e0a0" }}
                  formatter={(v) => formatMoney(Number(v) || 0, currency)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#d4af37"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">
              Low Stock
            </h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-ink-500">All items well stocked.</p>
          ) : (
            <ul className="space-y-2.5">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#c9bd9e]">
                    <ProductThumb images={p.images} size={22} />
                    {p.name}
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">
            Recent Transactions
          </h2>
          <button
            onClick={() => navigate("/sales")}
            className="text-xs font-medium text-gold-500 hover:text-gold-300"
          >
            View all →
          </button>
        </div>
        {recentSales.length === 0 ? (
          <p className="text-sm text-ink-500">No sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-900/30 text-left text-xs uppercase tracking-wider text-ink-500">
                  <th className="py-2 pr-4 font-medium">Invoice</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Items</th>
                  <th className="py-2 pr-4 font-medium">Payment</th>
                  <th className="py-2 pr-0 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id} className="border-b border-gold-900/10 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gold-300">{s.invoiceNo}</td>
                    <td className="py-2.5 pr-4 text-[#c9bd9e]">{s.customerName || "Walk-in"}</td>
                    <td className="py-2.5 pr-4 text-ink-500">{s.items.length}</td>
                    <td className="py-2.5 pr-4 text-ink-500">{s.paymentMethod}</td>
                    <td className="py-2.5 pr-0 text-right font-semibold text-gold-200">
                      {formatMoney(s.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowRateModal(true)}
        className="fixed bottom-20 right-4 flex items-center gap-2 rounded-full bg-gold-600 px-4 py-2.5 text-xs font-semibold text-ink-950 shadow-lg md:hidden"
      >
        <Pencil size={14} /> Update Rate
      </button>

      {showRateModal && (
        <GoldRateModal forceOpen onDone={() => setShowRateModal(false)} />
      )}
    </div>
  );
}
