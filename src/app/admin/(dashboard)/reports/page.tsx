"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Card, Badge } from "@/components/admin/Card";
import { formatPkr, purityLabel } from "@/lib/format";

const TABS = ["Sales", "Customers", "Products", "Gold Rates"] as const;

export default function ReportsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("Sales");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Reports</h1>
      <div className="flex flex-wrap gap-2 border-b border-gold/20 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${tab === t ? "border-maroon bg-maroon text-cream" : "border-cream-dark text-brown-light"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Sales" && <SalesReport />}
      {tab === "Customers" && <CustomersReport />}
      {tab === "Products" && <ProductsReport />}
      {tab === "Gold Rates" && <GoldRatesReport />}
    </div>
  );
}

function SalesReport() {
  const [data, setData] = useState<{ summary: { total: number; count: number }; rows: Record<string, string | number>[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/reports/sales").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-brown-light">Loading…</p>;

  return (
    <Card title="Sales Report (Last 30 Days)" action={
      <a href="/api/admin/reports/sales?format=csv" className="flex items-center gap-1.5 text-xs text-maroon hover:underline"><Download className="h-3.5 w-3.5" /> Export CSV</a>
    }>
      <div className="mb-4 flex gap-6 text-sm">
        <p>Total: <span className="font-semibold text-maroon">{formatPkr(data.summary.total, 0)}</span></p>
        <p>Transactions: <span className="font-semibold text-maroon">{data.summary.count}</span></p>
      </div>
      <ReportTable rows={data.rows} />
    </Card>
  );
}

function CustomersReport() {
  const [data, setData] = useState<{ summary: Record<string, number>; rows: Record<string, string | number>[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/reports/customers").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-brown-light">Loading…</p>;

  return (
    <Card title="Customer Report" action={
      <a href="/api/admin/reports/customers?format=csv" className="flex items-center gap-1.5 text-xs text-maroon hover:underline"><Download className="h-3.5 w-3.5" /> Export CSV</a>
    }>
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <Badge>Total: {data.summary.total}</Badge>
        <Badge tone="success">New (30d): {data.summary.newLast30Days}</Badge>
        <Badge tone="gold">VIP: {data.summary.vip}</Badge>
        <Badge>Returning: {data.summary.returning}</Badge>
        <Badge tone="warning">Birthday this week: {data.summary.birthdayThisWeek}</Badge>
      </div>
      <ReportTable rows={data.rows} />
    </Card>
  );
}

function ProductsReport() {
  const [data, setData] = useState<{
    mostViewed: Record<string, string | number>[];
    mostInquired: Record<string, string | number>[];
    mostSold: Record<string, string | number>[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/reports/products").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-brown-light">Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Most Viewed"><ReportTable rows={data.mostViewed} compact /></Card>
      <Card title="Most Inquired"><ReportTable rows={data.mostInquired} compact /></Card>
      <Card title="Most Sold"><ReportTable rows={data.mostSold} compact /></Card>
    </div>
  );
}

function GoldRatesReport() {
  const [data, setData] = useState<{ rows: Record<string, string | number>[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/reports/gold-rates?days=180").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-brown-light">Loading…</p>;

  return (
    <Card title="Gold Rate History (180 days)" action={
      <a href="/api/admin/reports/gold-rates?format=csv&days=365" className="flex items-center gap-1.5 text-xs text-maroon hover:underline"><Download className="h-3.5 w-3.5" /> Export CSV</a>
    }>
      <ReportTable
        rows={data.rows.map((r) => ({ ...r, purity: purityLabel(r.purity as "K24" | "K21" | "K18") }))}
      />
    </Card>
  );
}

function ReportTable({ rows, compact }: { rows: Record<string, string | number>[]; compact?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-brown-light">No data available.</p>;
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
            {headers.map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, compact ? 10 : 100).map((row, i) => (
            <tr key={i} className="border-b border-gold/10">
              {headers.map((h) => <td key={h} className="py-1.5 pr-3">{String(row[h])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
