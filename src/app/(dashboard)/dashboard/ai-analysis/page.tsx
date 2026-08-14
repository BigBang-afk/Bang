import type { Metadata } from "next";

import { AiAnalysisPanel } from "@/components/dashboard/ai-analysis-panel";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow } from "@/types/database";

export const metadata: Metadata = { title: "AI Analysis" };

export default async function AiAnalysisPage() {
  await requireUser("/dashboard/ai-analysis");
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("market_assets")
    .select("*")
    .eq("is_active", true)
    .order("market_type", { ascending: true })
    .order("symbol", { ascending: true });

  return (
    <div>
      <PageHeader
        title="AI Analysis"
        description="Structured, AI-generated market analysis, computed from this platform's own live data and technical indicators — decision-support, not financial advice."
      />
      <AiAnalysisPanel assets={(assets ?? []) as MarketAssetRow[]} />
    </div>
  );
}
