import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db.from("custom_orders").select("*").order("created_at", { ascending: false }).limit(5000);

  const csv = toCsv((data ?? []) as unknown as Record<string, unknown>[], [
    { key: "order_number", header: "Order #" },
    { key: "customer_name", header: "Name" },
    { key: "mobile_number", header: "Mobile" },
    { key: "jewelry_type", header: "Jewelry Type" },
    { key: "gold_purity", header: "Purity" },
    { key: "approx_weight_grams", header: "Approx Weight" },
    { key: "budget", header: "Budget" },
    { key: "required_date", header: "Required Date" },
    { key: "status", header: "Status" },
    { key: "created_at", header: "Created At" },
  ]);

  return csvResponse("custom-orders.csv", csv);
}
