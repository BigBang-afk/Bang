import type { Metadata } from "next";
import { BookOpen, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { createJournalEntryAction, deleteJournalEntryAction } from "@/lib/actions/journal";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MarketAssetRow, TradeJournalRow } from "@/types/database";

export const metadata: Metadata = { title: "Trade Journal" };

type EntryWithAsset = TradeJournalRow & { market_assets: MarketAssetRow | null };

export default async function JournalPage() {
  const profile = await requireUser("/dashboard/journal");
  const supabase = await createClient();

  const [{ data: entries }, { data: assets }] = await Promise.all([
    supabase
      .from("trade_journal")
      .select("*, market_assets(*)")
      .eq("user_id", profile.id)
      .order("opened_at", { ascending: false }),
    supabase.from("market_assets").select("*").eq("is_active", true).order("symbol"),
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
          <form action={createJournalEntryAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="assetId">Asset</Label>
              <Select name="assetId">
                <SelectTrigger id="assetId" className="w-full">
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {(assets ?? []).map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="direction">Direction</Label>
              <Select name="direction" defaultValue="long">
                <SelectTrigger id="direction" className="w-full">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="positionSize">Position size</Label>
              <Input id="positionSize" name="positionSize" type="number" step="any" min="0" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entryPrice">Entry price</Label>
              <Input id="entryPrice" name="entryPrice" type="number" step="any" min="0" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exitPrice">Exit price (optional)</Label>
              <Input id="exitPrice" name="exitPrice" type="number" step="any" min="0" />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit">Log trade</Button>
            </div>
          </form>
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
