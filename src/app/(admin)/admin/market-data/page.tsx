import type { Metadata } from "next";
import { CandlestickChart } from "lucide-react";

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
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Market Data" };

export default async function AdminMarketDataPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("market_assets")
    .select("*")
    .order("market_type")
    .order("symbol");

  return (
    <div>
      <PageHeader
        title="Market data"
        description="Tracked assets and their feed status. A live pricing feed connects in Phase 2 — until then, these rows are reference data only."
      />

      {!assets || assets.length === 0 ? (
        <EmptyState
          icon={CandlestickChart}
          title="No market assets configured"
          description="Add rows to public.market_assets to make assets available across the platform."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Exchange</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.symbol}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.display_name}
                    </TableCell>
                    <TableCell className="capitalize">{asset.market_type}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.exchange ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.is_active ? "default" : "secondary"}>
                        {asset.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Not connected</Badge>
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
