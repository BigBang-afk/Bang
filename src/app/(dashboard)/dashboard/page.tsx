import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Eye, LineChart, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const profile = await requireUser("/dashboard");
  const supabase = await createClient();

  const [watchlists, journalEntries, activeSetups] = await Promise.all([
    supabase
      .from("watchlists")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("trade_journal")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("trading_setups")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .or(`user_id.eq.${profile.id},user_id.is.null`),
  ]);

  const stats = [
    {
      label: "Watchlists",
      value: watchlists.count ?? 0,
      icon: Eye,
      href: "/dashboard/watchlist",
    },
    {
      label: "Journal entries",
      value: journalEntries.count ?? 0,
      icon: BookOpen,
      href: "/dashboard/journal",
    },
    {
      label: "Active setups",
      value: activeSetups.count ?? 0,
      icon: LineChart,
      href: "/dashboard/setups",
    },
  ];

  const displayName =
    profile.display_name || profile.full_name?.split(" ")[0] || "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${displayName}`}
        description="Here's a snapshot of your account. Markets, scanning and AI analysis roll out through the phases ahead."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <Link
                href={stat.href}
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                View {stat.label.toLowerCase()}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Get started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Build your first watchlist</p>
              <p className="text-sm text-muted-foreground">
                Track the assets you care about across crypto, forex, gold and
                indices.
              </p>
            </div>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/watchlist">Open watchlist</Link>}
            />
          </div>
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Size your next trade</p>
              <p className="text-sm text-muted-foreground">
                Use the risk calculator to size a position before you enter.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link href="/dashboard/risk-calculator">Open calculator</Link>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
