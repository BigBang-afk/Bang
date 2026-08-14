import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { formatPlanPrice } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { PlanRow, ProfileRow, SubscriptionRow } from "@/types/database";

export const metadata: Metadata = { title: "Subscriptions" };

type Row = SubscriptionRow & { plans: PlanRow; profiles: ProfileRow };

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("*, plans(*), profiles(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Every subscription record. Billing history and plan changes activate once payments are wired up."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="New accounts are placed on the Free plan automatically."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.profiles.display_name || row.profiles.full_name || row.user_id}
                    </TableCell>
                    <TableCell>{row.plans.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatPlanPrice(row.plans.price_monthly_cents, row.plans.currency)}/mo
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.current_period_start).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
