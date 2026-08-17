import {
  getSalesForecast,
  getExpenseForecast,
  getCashForecast,
  getInventoryDemandForecast,
  getCustomerPurchaseForecast,
  type ForecastPeriodDays,
} from "@/services/forecast.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Forecasting | Zarghoon Jewellers" };

const PERIODS: ForecastPeriodDays[] = [7, 30, 90];

function ConfidenceBadge({ confidence }: { confidence: "INSUFFICIENT_DATA" | "LOW_CONFIDENCE" | "STANDARD_CONFIDENCE" }) {
  const variant = confidence === "STANDARD_CONFIDENCE" ? "success" : confidence === "LOW_CONFIDENCE" ? "warning" : "danger";
  return <Badge variant={variant}>{confidence.replace("_", " ")}</Badge>;
}

export default async function ForecastingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const periodDays = (PERIODS.includes(Number(params.period) as ForecastPeriodDays) ? Number(params.period) : 30) as ForecastPeriodDays;

  const [sales, expense, cash, inventoryDemand, customerPurchase] = await Promise.all([
    getSalesForecast(periodDays),
    getExpenseForecast(periodDays),
    getCashForecast(periodDays),
    getInventoryDemandForecast(),
    getCustomerPurchaseForecast(periodDays),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Forecasting</h1>
        <p className="text-sm text-muted-foreground">
          Every number below is an <strong>ESTIMATE</strong>, based on historical data. Never guaranteed, never certain, never 100% accurate.
        </p>
      </div>

      <form method="GET" className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Forecast period:</span>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="submit"
            name="period"
            value={p}
            className={p === periodDays ? "rounded-md border border-gold px-3 py-1 font-semibold text-gold" : "rounded-md border border-border px-3 py-1 text-muted-foreground hover:text-foreground"}
          >
            {p} days
          </button>
        ))}
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales Forecast</CardTitle>
            <ConfidenceBadge confidence={sales.confidence} />
          </CardHeader>
          <CardContent>
            {sales.forecastTotal === null ? (
              <p className="text-sm text-muted-foreground">INSUFFICIENT DATA — only {sales.historyDaysAvailable} day(s) of sales history recorded.</p>
            ) : (
              <>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(sales.forecastTotal)}</p>
                <p className="text-xs text-muted-foreground">
                  Historical daily average: {formatCurrency(sales.historicalDailyAverage)} · {sales.basis}
                </p>
              </>
            )}
            <Badge variant="neutral" className="mt-2">
              {sales.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expense Forecast</CardTitle>
            <ConfidenceBadge confidence={expense.confidence} />
          </CardHeader>
          <CardContent>
            {expense.forecastTotal === null ? (
              <p className="text-sm text-muted-foreground">INSUFFICIENT DATA — only {expense.historyDaysAvailable} day(s) of expense history.</p>
            ) : (
              <>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(expense.forecastTotal)}</p>
                <p className="text-xs text-muted-foreground">
                  Recurring (monthly): {formatCurrency(expense.recurringMonthlyEstimate)} · Variable (monthly): {formatCurrency(expense.variableMonthlyEstimate)}
                </p>
                <p className="text-xs text-muted-foreground">{expense.basis}</p>
              </>
            )}
            <Badge variant="neutral" className="mt-2">
              {expense.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cash Forecast</CardTitle>
            <ConfidenceBadge confidence={cash.confidence} />
          </CardHeader>
          <CardContent>
            {cash.projectedCash === null ? (
              <p className="text-sm text-muted-foreground">INSUFFICIENT DATA to project cash.</p>
            ) : (
              <>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(cash.projectedCash)}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Opening: {formatCurrency(cash.openingCash)}</p>
                  <p>+ Sales receipts: {formatCurrency(cash.expectedSalesReceipts!)}</p>
                  <p>+ Customer payments: {formatCurrency(cash.expectedCustomerPayments!)}</p>
                  <p>− Supplier payments: {formatCurrency(cash.expectedSupplierPayments!)}</p>
                  <p>− Expenses: {formatCurrency(cash.expectedExpenses!)}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{cash.basis}</p>
              </>
            )}
            <Badge variant="neutral" className="mt-2">
              {cash.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Customer Purchase Forecast</CardTitle>
            <ConfidenceBadge confidence={customerPurchase.confidence} />
          </CardHeader>
          <CardContent>
            {customerPurchase.forecastOrderCount === null ? (
              <p className="text-sm text-muted-foreground">INSUFFICIENT DATA to forecast order volume.</p>
            ) : (
              <>
                <p className="text-2xl font-semibold text-foreground">{customerPurchase.forecastOrderCount} orders</p>
                <p className="text-xs text-muted-foreground">
                  Historical daily average: {customerPurchase.historicalDailyOrderAverage} orders/day · {customerPurchase.basis}
                </p>
              </>
            )}
            <Badge variant="neutral" className="mt-2">
              {customerPurchase.label}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Demand Forecast</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inventoryDemand.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No products have enough sales history yet for a demand estimate.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Avg. Sales Rate (units/day)</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Est. Days of Stock</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryDemand.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell className="text-right">{row.averageDailySalesRate}</TableCell>
                    <TableCell className="text-right">{row.currentStock}</TableCell>
                    <TableCell className="text-right">{row.estimatedDaysOfStock ?? "—"}</TableCell>
                    <TableCell>
                      {row.suggestedReplenishment ? (
                        <Badge variant="warning">Consider replenishment</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No action suggested</span>
                      )}
                    </TableCell>
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
