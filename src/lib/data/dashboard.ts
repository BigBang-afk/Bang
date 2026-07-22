import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveGoldRates, getGoldRateHistory } from "@/lib/data/gold-rates";

export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  newArrivals: number;
  outOfStock: number;
  totalCategories: number;
  totalCollections: number;
  totalInquiries: number;
  newInquiries: number;
  totalCustomOrders: number;
  pendingTestimonials: number;
  todayRate24k: number | null;
  previousRate24k: number | null;
  rateChange24k: number | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = createAdminClient();

  const [
    productsAll,
    productsActive,
    productsInactive,
    productsFeatured,
    productsNew,
    productsOOS,
    categories,
    collections,
    inquiriesAll,
    inquiriesNew,
    customOrders,
    testimonialsPending,
    goldRates,
  ] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
    db.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_active", true),
    db.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_active", false),
    db.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_featured", true),
    db.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("is_new_arrival", true),
    db.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("availability_status", "out_of_stock"),
    db.from("categories").select("id", { count: "exact", head: true }),
    db.from("collections").select("id", { count: "exact", head: true }),
    db.from("inquiries").select("id", { count: "exact", head: true }),
    db.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    db.from("custom_orders").select("id", { count: "exact", head: true }),
    db.from("testimonials").select("id", { count: "exact", head: true }).eq("is_approved", false),
    getActiveGoldRates(),
  ]);

  const rate24k = goldRates.find((r) => r.purity === "24K");

  return {
    totalProducts: productsAll.count ?? 0,
    activeProducts: productsActive.count ?? 0,
    inactiveProducts: productsInactive.count ?? 0,
    featuredProducts: productsFeatured.count ?? 0,
    newArrivals: productsNew.count ?? 0,
    outOfStock: productsOOS.count ?? 0,
    totalCategories: categories.count ?? 0,
    totalCollections: collections.count ?? 0,
    totalInquiries: inquiriesAll.count ?? 0,
    newInquiries: inquiriesNew.count ?? 0,
    totalCustomOrders: customOrders.count ?? 0,
    pendingTestimonials: testimonialsPending.count ?? 0,
    todayRate24k: rate24k ? parseFloat(rate24k.rate_per_gram) : null,
    previousRate24k: rate24k?.previous_rate_per_tola ? parseFloat(rate24k.previous_rate_per_tola) : null,
    rateChange24k: rate24k ? parseFloat(rate24k.rate_change) : null,
  };
}

export async function getGoldRateChartData(days = 30) {
  const history = await getGoldRateHistory({ purity: "24K", limit: days });
  return history
    .slice()
    .reverse()
    .map((h) => ({ date: h.effective_date, ratePerGram: parseFloat(h.rate_per_gram) }));
}

export async function getCategoryDistribution() {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("category_id, categories(name)")
    .is("deleted_at", null)
    .eq("is_active", true);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as { category_id: string | null; categories: { name: string } | null }[]) {
    const name = row.categories?.name ?? "Uncategorized";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

export async function getMostViewedProducts(limit = 5) {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("id, name, product_code, view_count, inquiry_count")
    .is("deleted_at", null)
    .order("view_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getMostInquiredProducts(limit = 5) {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("id, name, product_code, view_count, inquiry_count")
    .is("deleted_at", null)
    .order("inquiry_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getMonthlyInquiries(months = 6) {
  const db = createAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const { data } = await db.from("inquiries").select("created_at").gte("created_at", since.toISOString());

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { created_at: string }[]) {
    const key = row.created_at.slice(0, 7); // YYYY-MM
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export interface RecentActivityItem {
  id: string;
  type: "product" | "gold_rate" | "inquiry" | "custom_order" | "admin_action";
  title: string;
  subtitle: string;
  createdAt: string;
}

export async function getRecentActivity(limit = 8): Promise<RecentActivityItem[]> {
  const db = createAdminClient();
  const [{ data: products }, { data: rates }, { data: inquiries }, { data: orders }] = await Promise.all([
    db.from("products").select("id, name, product_code, created_at").order("created_at", { ascending: false }).limit(limit),
    db.from("gold_rate_history").select("id, purity, rate_per_gram, created_at").order("created_at", { ascending: false }).limit(limit),
    db.from("inquiries").select("id, customer_name, inquiry_number, created_at").order("created_at", { ascending: false }).limit(limit),
    db.from("custom_orders").select("id, customer_name, order_number, created_at").order("created_at", { ascending: false }).limit(limit),
  ]);

  const items: RecentActivityItem[] = [
    ...(products ?? []).map((p) => ({
      id: `product-${p.id}`,
      type: "product" as const,
      title: `New product: ${p.name}`,
      subtitle: p.product_code,
      createdAt: p.created_at,
    })),
    ...(rates ?? []).map((r) => ({
      id: `rate-${r.id}`,
      type: "gold_rate" as const,
      title: `${r.purity} rate updated`,
      subtitle: `PKR ${r.rate_per_gram}/gram`,
      createdAt: r.created_at,
    })),
    ...(inquiries ?? []).map((i) => ({
      id: `inquiry-${i.id}`,
      type: "inquiry" as const,
      title: `New inquiry: ${i.customer_name}`,
      subtitle: i.inquiry_number,
      createdAt: i.created_at,
    })),
    ...(orders ?? []).map((o) => ({
      id: `order-${o.id}`,
      type: "custom_order" as const,
      title: `New custom order: ${o.customer_name}`,
      subtitle: o.order_number,
      createdAt: o.created_at,
    })),
  ];

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
