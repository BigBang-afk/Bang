import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { RiskCalculatorForm } from "@/components/dashboard/risk-calculator-form";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow } from "@/types/database";

export const metadata: Metadata = { title: "Risk Calculator" };

export default async function RiskCalculatorPage() {
  await requireUser("/dashboard/risk-calculator");
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("market_assets")
    .select("*")
    .eq("is_active", true)
    .order("symbol");

  return (
    <div>
      <PageHeader
        title="Risk Calculator"
        description="Size a position based on your account risk, entry and stop-loss. Purely a calculation tool — it doesn't place trades, and it never guesses a contract specification it doesn't have."
      />
      <RiskCalculatorForm assets={(assets ?? []) as MarketAssetRow[]} />
    </div>
  );
}
