import {
  getCustomerAnalyticsSummary,
  getTopCustomers,
  getAverageCustomerLifetimeValue,
  getCustomerCohorts,
} from "@/services/bi-customer-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Customer Analytics | Zarghoon Jewellers" };

export default async function CustomerAnalyticsPage() {
  const [summary, topBySpending, topByFrequency, ltv, cohorts] = await Promise.all([
    getCustomerAnalyticsSummary(),
    getTopCustomers("spending", 10),
    getTopCustomers("frequency", 10),
    getAverageCustomerLifetimeValue(),
    getCustomerCohorts(6, 8),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Customer Analytics</h1>
        <p className="text-sm text-muted-foreground">Cohort retention reports a fact — it never claims a cause.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total Customers", summary.totalCustomers],
          ["New This Month", summary.newThisMonth],
          ["Active", summary.active],
          ["VIP", summary.vip],
          ["Inactive", summary.inactive],
          ["Repeat Customers", summary.repeatCustomers],
          ["With Outstanding Balance", summary.withOutstandingBalance],
          ["Repeat Purchase Rate", summary.repeatPurchaseRatePercent ? `${summary.repeatPurchaseRatePercent}%` : "N/A"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">Average Customer Lifetime Value ({ltv.customersConsidered} customers)</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(ltv.averageLifetimeValue)}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Spending</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Spending</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topBySpending.map((c) => (
                  <TableRow key={c.customerId}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.totalSpending)}</TableCell>
                    <TableCell className="text-right">{c.purchaseCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most Frequent Buyers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Avg. Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topByFrequency.map((c) => (
                  <TableRow key={c.customerId}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">{c.purchaseCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.averagePurchaseValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Cohorts (retention by first-purchase month)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cohort</TableHead>
                <TableHead className="text-right">Size</TableHead>
                {cohorts[0]?.retentionPercent.map((_, i) => (
                  <TableHead key={i} className="text-right">
                    Month {i}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                    Not enough purchase history yet.
                  </TableCell>
                </TableRow>
              ) : (
                cohorts.map((cohort) => (
                  <TableRow key={cohort.cohortMonth}>
                    <TableCell>{cohort.cohortMonth}</TableCell>
                    <TableCell className="text-right">{cohort.cohortSize}</TableCell>
                    {cohort.retentionPercent.map((pct, i) => (
                      <TableCell key={i} className="text-right">
                        {pct !== null ? `${pct}%` : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
