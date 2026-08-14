import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { adminUpdateSubscriptionAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { formatPlanPrice } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { PlanRow, ProfileRow, SubscriptionRow, SubscriptionStatus } from "@/types/database";

export const metadata: Metadata = { title: "Subscriptions" };

type Row = SubscriptionRow & { plans: PlanRow; profiles: ProfileRow };

const statuses: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "expired",
];

export default async function AdminSubscriptionsPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [{ data }, { data: plans }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, plans(*), profiles(*)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("plans").select("*").order("sort_order"),
  ]);

  const rows = (data ?? []) as unknown as Row[];
  const isSuperadmin = admin.role === "superadmin";

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description={
          isSuperadmin
            ? "Every subscription record. Plan/status overrides here are support-ops tools — real billing changes activate once payments are wired up."
            : "Every subscription record. Billing history and plan changes activate once payments are wired up."
        }
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
                  {isSuperadmin && <TableHead className="w-64">Override</TableHead>}
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
                    {isSuperadmin && (
                      <TableCell>
                        <form
                          action={adminUpdateSubscriptionAction}
                          className="flex items-center gap-1.5"
                        >
                          <input type="hidden" name="subscriptionId" value={row.id} />
                          <Select name="planId" defaultValue={row.plans.id}>
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(plans ?? []).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select name="status" defaultValue={row.status}>
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="submit" size="sm" variant="ghost">
                            Save
                          </Button>
                        </form>
                      </TableCell>
                    )}
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
