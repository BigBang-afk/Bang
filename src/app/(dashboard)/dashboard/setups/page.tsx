import type { Metadata } from "next";
import { LineChart, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CreateSetupForm } from "@/components/dashboard/create-setup-form";
import { deleteSetupAction, updateSetupStatusAction } from "@/lib/actions/setups";
import { checkUsageLimit } from "@/lib/entitlements";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow, SetupQuality, SetupStatus, TradingSetupRow } from "@/types/database";

export const metadata: Metadata = { title: "Setups" };

type SetupWithAsset = TradingSetupRow & { market_assets: MarketAssetRow | null };

const STATUS_OPTIONS: SetupStatus[] = ["active", "triggered", "completed", "invalidated", "expired"];

const STATUS_BADGE_VARIANT: Record<SetupStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  triggered: "secondary",
  completed: "default",
  invalidated: "destructive",
  expired: "outline",
  cancelled: "outline",
};

const QUALITY_LABEL: Record<SetupQuality, string> = {
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  excellent: "Excellent",
};

function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

export default async function SetupsPage() {
  const profile = await requireUser("/dashboard/setups");
  const supabase = await createClient();

  const [{ data: setups }, { data: assets }, setupsUsage] = await Promise.all([
    supabase
      .from("trading_setups")
      .select("*, market_assets(*)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("market_assets").select("*").eq("is_active", true).order("symbol"),
    checkUsageLimit(profile.id, "saved_setups"),
  ]);

  const rows = (setups ?? []) as unknown as SetupWithAsset[];

  return (
    <div>
      <PageHeader
        title="Setups"
        description="Structured entry/stop-loss/take-profit setups with a stated risk/reward ratio — your own trade ideas, not a signal feed. Not financial advice."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">New setup</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateSetupForm assets={assets ?? []} used={setupsUsage.used} limit={setupsUsage.limit} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No setups saved yet"
          description="Save your first setup above — entry, stop-loss and up to two take-profit targets, with the risk/reward ratio computed for you."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Timeframe</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Stop</TableHead>
                  <TableHead>TP1</TableHead>
                  <TableHead>TP2</TableHead>
                  <TableHead>R:R</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((setup) => (
                  <TableRow key={setup.id}>
                    <TableCell className="font-medium">
                      {setup.market_assets?.symbol ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          setup.direction === "long"
                            ? "border-success/40 text-success"
                            : "border-danger/40 text-danger"
                        }
                      >
                        {setup.direction === "long" ? "LONG" : "SHORT"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{setup.timeframe}</TableCell>
                    <TableCell>{formatPrice(setup.entry_price)}</TableCell>
                    <TableCell>{formatPrice(setup.stop_loss)}</TableCell>
                    <TableCell>{formatPrice(setup.take_profit_targets[0] ?? null)}</TableCell>
                    <TableCell>{formatPrice(setup.take_profit_targets[1] ?? null)}</TableCell>
                    <TableCell>
                      {setup.risk_reward_ratio !== null ? `1 : ${setup.risk_reward_ratio.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      {setup.setup_quality ? (
                        <Badge variant="secondary">{QUALITY_LABEL[setup.setup_quality]}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(setup.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="mb-1.5">
                        <Badge variant={STATUS_BADGE_VARIANT[setup.status]} className="capitalize">
                          {setup.status}
                        </Badge>
                      </div>
                      <form action={updateSetupStatusAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="setupId" value={setup.id} />
                        <Select name="status" defaultValue={setup.status}>
                          <SelectTrigger size="sm" className="w-32 capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
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
                    <TableCell>
                      <form action={deleteSetupAction}>
                        <input type="hidden" name="setupId" value={setup.id} />
                        <Button type="submit" variant="ghost" size="icon-xs" aria-label="Delete">
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </Button>
                      </form>
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
