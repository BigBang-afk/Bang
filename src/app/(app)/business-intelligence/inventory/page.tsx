import { getInventoryStatusBreakdown, getInventoryAgeBuckets, getSlowMovingInventory } from "@/services/bi-inventory-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Inventory Analytics | Zarghoon Jewellers" };

export default async function InventoryAnalyticsPage() {
  const [status, ageBuckets, slowMoving] = await Promise.all([
    getInventoryStatusBreakdown(),
    getInventoryAgeBuckets(),
    getSlowMovingInventory(20),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Inventory Intelligence</h1>
        <p className="text-sm text-muted-foreground">Aging and slow-moving stock are recommendations only — nothing here changes a price automatically.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total Items", status.totalItems],
          ["In Stock", status.inStock],
          ["Reserved", status.reserved],
          ["Sold", status.sold],
          ["Returned", status.returned],
          ["Damaged", status.damaged],
          ["Lost", status.lost],
          ["Inactive (Archived)", status.inactive],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Inventory Cost Value</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(status.costValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Inventory Selling Value</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(status.sellingValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Expected Gross Profit</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(status.expectedGrossProfit)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Age</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Age Bucket</TableHead>
                <TableHead className="text-right">Item Count</TableHead>
                <TableHead className="text-right">Cost Value</TableHead>
                <TableHead className="text-right">Selling Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ageBuckets.map((bucket) => (
                <TableRow key={bucket.label}>
                  <TableCell>
                    {bucket.label}
                    {bucket.label === "180+ days" && bucket.itemCount > 0 && (
                      <Badge variant="warning" className="ml-2">
                        AGING STOCK
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{bucket.itemCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bucket.costValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bucket.sellingValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slow-Moving Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {slowMoving.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No slow-moving items right now.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slowMoving.map((item) => (
                  <TableRow key={item.inventoryItemId}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell className="text-right">{item.daysSinceCreated}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.recommendation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
