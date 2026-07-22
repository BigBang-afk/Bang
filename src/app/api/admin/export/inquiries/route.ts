import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db.from("inquiries").select("*").order("created_at", { ascending: false }).limit(5000);

  const csv = toCsv((data ?? []) as unknown as Record<string, unknown>[], [
    { key: "inquiry_number", header: "Inquiry #" },
    { key: "customer_name", header: "Name" },
    { key: "mobile_number", header: "Mobile" },
    { key: "email", header: "Email" },
    { key: "product_code_snapshot", header: "Product Code" },
    { key: "purity_snapshot", header: "Purity" },
    { key: "gross_weight_snapshot", header: "Weight" },
    { key: "display_price_snapshot", header: "Price at Inquiry" },
    { key: "message", header: "Message" },
    { key: "status", header: "Status" },
    { key: "source", header: "Source" },
    { key: "created_at", header: "Created At" },
  ]);

  return csvResponse("inquiries.csv", csv);
}
