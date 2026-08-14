import type { Metadata } from "next";
import { BookOpen, ImageIcon, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CloseJournalEntryForm } from "@/components/dashboard/close-journal-entry-form";
import { CreateJournalEntryForm } from "@/components/dashboard/create-journal-entry-form";
import { deleteJournalEntryAction } from "@/lib/actions/journal";
import { checkUsageLimit } from "@/lib/entitlements";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow, TradeJournalRow } from "@/types/database";

export const metadata: Metadata = { title: "Trade Journal" };

type EntryWithAsset = TradeJournalRow & { market_assets: MarketAssetRow | null };

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  const dollars = cents / 100;
  const sign = dollars > 0 ? "+" : "";
  return `${sign}$${dollars.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function resultFor(entry: TradeJournalRow): { label: string; className: string } {
  if (entry.status !== "closed" || entry.pnl_cents === null) {
    return { label: "Open", className: "text-muted-foreground" };
  }
  if (entry.pnl_cents > 0) return { label: "Win", className: "text-success" };
  if (entry.pnl_cents < 0) return { label: "Loss", className: "text-danger" };
  return { label: "Breakeven", className: "text-muted-foreground" };
}

export default async function JournalPage() {
  const profile = await requireUser("/dashboard/journal");
  const supabase = await createClient();

  const [{ data: entries }, { data: assets }, journalUsage] = await Promise.all([
    supabase
      .from("trade_journal")
      .select("*, market_assets(*)")
      .eq("user_id", profile.id)
      .order("opened_at", { ascending: false }),
    supabase.from("market_assets").select("*").eq("is_active", true).order("symbol"),
    checkUsageLimit(profile.id, "journal_entries"),
  ]);

  const rows = (entries ?? []) as unknown as EntryWithAsset[];

  return (
    <div>
      <PageHeader
        title="Trade Journal"
        description="Log your trades manually for now — automatic import from broker/exchange APIs lands later."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Log a trade</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateJournalEntryForm
            assets={assets ?? []}
            used={journalUsage.used}
            limit={journalUsage.limit}
          />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No trades logged yet"
          description="Log your first trade above to start building a performance history."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Stop / Target</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>P/L</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10" />
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry) => {
                  const result = resultFor(entry);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.market_assets?.symbol ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            entry.direction === "long"
                              ? "border-success/40 text-success"
                              : "border-danger/40 text-danger"
                          }
                        >
                          {entry.direction === "long" ? "LONG" : "SHORT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.strategy ?? "—"}
                      </TableCell>
                      <TableCell>{entry.entry_price}</TableCell>
                      <TableCell>{entry.exit_price ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.stop_loss ?? "—"} / {entry.take_profit ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.risk_amount_cents !== null
                          ? `$${(entry.risk_amount_cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={result.className}>{result.label}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            entry.pnl_cents === null
                              ? "text-muted-foreground"
                              : entry.pnl_cents > 0
                                ? "text-success"
                                : entry.pnl_cents < 0
                                  ? "text-danger"
                                  : "text-muted-foreground"
                          }
                        >
                          {formatCents(entry.pnl_cents)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(entry.opened_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {entry.screenshot_url && (
                          <a
                            href={entry.screenshot_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label="View screenshot"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ImageIcon className="size-3.5" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {entry.status === "open" && (
                            <CloseJournalEntryForm entryId={entry.id} />
                          )}
                          <form action={deleteJournalEntryAction}>
                            <input type="hidden" name="entryId" value={entry.id} />
                            <Button type="submit" variant="ghost" size="icon-xs" aria-label="Delete">
                              <Trash2 className="size-3.5 text-muted-foreground" />
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
