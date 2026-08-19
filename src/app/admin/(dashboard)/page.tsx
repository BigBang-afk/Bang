"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Users, Gem, Tags, Coins, Cake, UserPlus, ClipboardList, TrendingUp, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { Card, Badge } from "@/components/admin/Card";
import { formatPkr, formatDateTime } from "@/lib/format";

const COLORS = ["#5c0e21", "#c9a24b", "#a67f2e", "#7a1a30", "#e8d6a0", "#2a1a12"];

interface DashboardData {
  cards: {
    totalCustomers: number;
    totalProducts: number;
    totalCategories: number;
    todaysGoldRate: { K24: number | null; K21: number | null; K18: number | null };
    todaysBirthdays: number;
    newCustomersThisMonth: number;
    totalOrders: number;
    totalSales: number;
    lowStockProducts: number;
  };
  charts: {
    salesSeries: { date: string; total: number }[];
    registrationSeries: { month: string; count: number }[];
    categoryPopularity: { name: string; count: number }[];
  };
  recentOrders: { id: string; orderNumber: string; status: string; createdAt: string; customer: { fullName: string } | null; items: { finalPriceAtOrder: string }[] }[];
  recentActivity: { id: string; action: string; description: string | null; createdAt: string; admin: { name: string } | null }[];
  todaysBirthdayList: { id: string; fullName: string; mobile: string }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard").then((res) => res.json()).then(setData);
  }, []);

  if (!data) return <p className="text-brown-light">Loading dashboard…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Customers" value={data.cards.totalCustomers} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total Products" value={data.cards.totalProducts} icon={<Gem className="h-5 w-5" />} />
        <StatCard label="Total Categories" value={data.cards.totalCategories} icon={<Tags className="h-5 w-5" />} />
        <StatCard label="Total Orders / Inquiries" value={data.cards.totalOrders} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard
          label="Today's Gold Rate (21K)"
          value={data.cards.todaysGoldRate.K21 ? formatPkr(data.cards.todaysGoldRate.K21, 0) : "—"}
          icon={<Coins className="h-5 w-5" />}
        />
        <StatCard label="Today's Birthdays" value={data.cards.todaysBirthdays} icon={<Cake className="h-5 w-5" />} />
        <StatCard label="New Customers (this month)" value={data.cards.newCustomersThisMonth} icon={<UserPlus className="h-5 w-5" />} />
        <StatCard label="Total Sales (30 days)" value={formatPkr(data.cards.totalSales, 0)} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      {data.cards.lowStockProducts > 0 && (
        <div className="flex items-center gap-2 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> {data.cards.lowStockProducts} product(s) are out of stock.
          <Link href="/admin/products?stockStatus=OUT_OF_STOCK" className="ml-auto underline">Review</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Sales — Last 30 Days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.charts.salesSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8d6a033" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={70} />
              <Tooltip formatter={(v) => formatPkr(Number(v), 0)} />
              <Line type="monotone" dataKey="total" stroke="#5c0e21" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Category Popularity">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.charts.categoryPopularity} dataKey="count" nameKey="name" outerRadius={90}>
                {data.charts.categoryPopularity.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Customer Registrations (12 months)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.charts.registrationSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d6a033" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip />
            <Bar dataKey="count" fill="#c9a24b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Today's Birthdays" action={<Link href="/admin/customers/birthdays" className="text-xs text-maroon hover:underline">View all</Link>}>
          {data.todaysBirthdayList.length === 0 ? (
            <p className="text-sm text-brown-light">No birthdays today.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.todaysBirthdayList.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span>🎂 {c.fullName} — {c.mobile}</span>
                  <Link href="/admin/customers/marketing" className="text-xs text-maroon hover:underline">Send Message</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Activity" action={<Link href="/admin/activity" className="text-xs text-maroon hover:underline">View all</Link>}>
          <ul className="flex flex-col gap-3 text-sm">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="flex justify-between gap-4">
                <span className="text-brown-light">{a.description ?? a.action}</span>
                <span className="shrink-0 text-xs text-brown-light/70">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Recent Orders / Inquiries" action={<Link href="/admin/orders" className="text-xs text-maroon hover:underline">View all</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2">Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-gold/10">
                  <td className="py-2"><Link href={`/admin/orders/${o.id}`} className="text-maroon hover:underline">{o.orderNumber}</Link></td>
                  <td>{o.customer?.fullName ?? "Guest"}</td>
                  <td><Badge>{o.status}</Badge></td>
                  <td>{formatPkr(o.items.reduce((s, i) => s + Number(i.finalPriceAtOrder), 0), 0)}</td>
                  <td className="text-xs text-brown-light">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
