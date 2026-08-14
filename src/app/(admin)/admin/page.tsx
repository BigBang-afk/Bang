import type { Metadata } from "next";
import { Activity, BookOpen, CreditCard, Eye, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [users, subscriptions, watchlists, journalEntries] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),
    supabase.from("watchlists").select("id", { count: "exact", head: true }),
    supabase.from("trade_journal").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total users", value: users.count ?? 0, icon: Users },
    { label: "Active subscriptions", value: subscriptions.count ?? 0, icon: CreditCard },
    { label: "Watchlists created", value: watchlists.count ?? 0, icon: Eye },
    { label: "Journal entries", value: journalEntries.count ?? 0, icon: BookOpen },
  ];

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Live counts from the database. Deeper analytics and trends land in a later phase."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" />
            Foundation status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Phase 1 ships auth, the database schema, RLS policies, and this admin shell.
            Live market data, AI analysis and payments connect in later phases — see
            System Status for the current connection state of each integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
