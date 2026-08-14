import type { Metadata } from "next";
import { BookOpen, Trash2 } from "lucide-react";

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
import { CreateJournalEntryForm } from "@/components/dashboard/create-journal-entry-form";
import { deleteJournalEntryAction } from "@/lib/actions/journal";
import { checkUsageLimit } from "@/lib/entitlements";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow, TradeJournalRow } from "@/types/database";

export const metadata: Metadata = { title: "Trade Journal" };

type EntryWithAsset = TradeJournalRow & { market_assets: MarketAssetRow | null };

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
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry) => (
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
                    <TableCell>{entry.entry_price}</TableCell>
                    <TableCell>{entry.exit_price ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.opened_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <form action={deleteJournalEntryAction}>
                        <input type="hidden" name="entryId" value={entry.id} />
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
