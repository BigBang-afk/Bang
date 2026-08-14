import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "AI Usage" };

export default async function AdminAiUsagePage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: total }, { count: failed }] = await Promise.all([
    supabase.from("ai_analyses").select("id", { count: "exact", head: true }),
    supabase
      .from("ai_analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  const hasData = (total ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="AI usage"
        description="Every AI call — model, tokens, latency and outcome — is logged in ai_analyses for transparency and cost tracking."
      />

      {!hasData ? (
        <EmptyState
          icon={Sparkles}
          title="No AI analyses yet"
          description="No one has run an AI analysis yet. Once they do, every request will show up here with its model, tokens, latency and outcome."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{failed}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
