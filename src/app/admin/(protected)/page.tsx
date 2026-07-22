import type { Metadata } from "next";
import {
  Gem, CheckCircle2, XCircle, Star, Sparkles, PackageX, FolderTree, Layers,
  Coins, MessageSquare, Inbox,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { GoldRateLineChart, CategoryBarChart, MonthlyInquiriesChart } from "@/components/admin/charts";
import { formatDateTime, formatPKR } from "@/lib/utils";
import {
  getDashboardStats, getGoldRateChartData, getCategoryDistribution, getMostViewedProducts,
  getMostInquiredProducts, getMonthlyInquiries, getRecentActivity,
} from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const [stats, rateHistory, categoryDist, mostViewed, mostInquired, monthlyInquiries, recentActivity] =
    await Promise.all([
      getDashboardStats(),
      getGoldRateChartData(),
      getCategoryDistribution(),
      getMostViewedProducts(),
      getMostInquiredProducts(),
      getMonthlyInquiries(),
      getRecentActivity(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Dashboard</h1>
        <p className="text-sm text-charcoal/60">Overview of Zarghoon Jewellers website activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Products" value={stats.totalProducts} icon={Gem} />
        <StatCard label="Active Products" value={stats.activeProducts} icon={CheckCircle2} tone="gold" />
        <StatCard label="Inactive Products" value={stats.inactiveProducts} icon={XCircle} />
        <StatCard label="Featured Products" value={stats.featuredProducts} icon={Star} tone="gold" />
        <StatCard label="New Arrivals" value={stats.newArrivals} icon={Sparkles} />
        <StatCard label="Out of Stock" value={stats.outOfStock} icon={PackageX} tone="warn" />
        <StatCard label="Categories" value={stats.totalCategories} icon={FolderTree} />
        <StatCard label="Collections" value={stats.totalCollections} icon={Layers} />
        <StatCard
          label="Today's 24K Rate"
          value={stats.todayRate24k ? formatPKR(stats.todayRate24k) : "Not set"}
          suffix={stats.todayRate24k ? "/g" : undefined}
          icon={Coins}
          tone="gold"
        />
        <StatCard label="Total Inquiries" value={stats.totalInquiries} icon={MessageSquare} />
        <StatCard label="New Inquiries" value={stats.newInquiries} icon={Inbox} tone={stats.newInquiries > 0 ? "warn" : "default"} />
        <StatCard label="Custom Orders" value={stats.totalCustomOrders} icon={Sparkles} />
      </div>

      {stats.pendingTestimonials > 0 && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {stats.pendingTestimonials} testimonial(s) awaiting approval —{" "}
          <a href="/admin/testimonials" className="font-medium underline">review now</a>.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="font-serif text-lg">Gold Rate History (24K)</h2></CardHeader>
          <CardBody><GoldRateLineChart data={rateHistory} /></CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-serif text-lg">Product Category Distribution</h2></CardHeader>
          <CardBody><CategoryBarChart data={categoryDist} /></CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-serif text-lg">Monthly Inquiries</h2></CardHeader>
          <CardBody><MonthlyInquiriesChart data={monthlyInquiries} /></CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-serif text-lg">Recent Activity</h2></CardHeader>
          <CardBody>
            <ul className="divide-y divide-charcoal/10">
              {recentActivity.length === 0 && <p className="text-sm text-charcoal/50">No recent activity.</p>}
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-charcoal">{item.title}</p>
                    <p className="text-xs text-charcoal/50">{item.subtitle}</p>
                  </div>
                  <span className="text-xs text-charcoal/40">{formatDateTime(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="font-serif text-lg">Most Viewed Products</h2></CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-charcoal/50">
                  <th className="pb-2">Product</th><th className="pb-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {mostViewed.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.name} <span className="text-charcoal/40">({p.product_code})</span></td>
                    <td className="py-2 text-right font-medium">{p.view_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-serif text-lg">Most Inquired Products</h2></CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-charcoal/50">
                  <th className="pb-2">Product</th><th className="pb-2 text-right">Inquiries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {mostInquired.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.name} <span className="text-charcoal/40">({p.product_code})</span></td>
                    <td className="py-2 text-right font-medium">{p.inquiry_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
