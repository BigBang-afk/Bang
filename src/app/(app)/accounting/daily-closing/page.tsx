import { userHasPermission, requireUser } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { computeDailyClosingFigures, getDailyClosingByDate, getCurrentBusinessDate } from "@/services/daily-closing.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyClosingDatePicker } from "@/components/accounting/daily-closing-date-picker";
import { DailyClosingIssues } from "@/components/accounting/daily-closing-issues";
import { SubmitDailyClosingForm } from "@/components/accounting/submit-daily-closing-form";
import { ConfirmDailyClosingButton, ReopenDailyClosingDialog } from "@/components/accounting/confirm-reopen-daily-closing";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";

export const metadata = { title: "Daily Closing | Zarghoon Jewellers" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "neutral" | "danger" }> = {
  OPEN: { label: "Open", variant: "neutral" },
  PENDING_REVIEW: { label: "Pending Review", variant: "warning" },
  CLOSED: { label: "Closed", variant: "success" },
  REOPENED: { label: "Reopened", variant: "danger" },
};

export default async function DailyClosingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const [canClose, canReopen, currentBusinessDate] = await Promise.all([
    userHasPermission(user, PERMISSIONS.ACCOUNTING_DAILY_CLOSING),
    userHasPermission(user, PERMISSIONS.ACCOUNTING_DAILY_CLOSING_REOPEN),
    getCurrentBusinessDate(),
  ]);

  const businessDate = params.businessDate ? new Date(params.businessDate) : currentBusinessDate;
  const businessDateKey = businessDate.toISOString().slice(0, 10);

  const [figures, record] = await Promise.all([
    computeDailyClosingFigures(businessDate),
    getDailyClosingByDate(businessDate),
  ]);

  const status = record?.status ?? "OPEN";
  const statusBadge = STATUS_BADGE[status];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Daily Closing</h1>
          <p className="text-sm text-muted-foreground">Business date: {businessDateKey}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          <DailyClosingDatePicker businessDate={businessDateKey} />
        </div>
      </div>

      {record?.status === "REOPENED" && record.reopenReason && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          Reopened{record.reopenedAt ? ` on ${formatDateTime(record.reopenedAt)}` : ""}: {record.reopenReason}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total Sales" value={formatCurrency(figures.sales.totalSales)} tone="gold" />
          <Stat label="Cash Sales" value={formatCurrency(figures.sales.cashSales)} />
          <Stat label="Card Sales" value={formatCurrency(figures.sales.cardSales)} />
          <Stat label="Bank Sales" value={formatCurrency(figures.sales.bankSales)} />
          <Stat label="Credit Sales" value={formatCurrency(figures.sales.creditSales)} />
          <Stat label="Refunds" value={formatCurrency(figures.sales.refunds)} tone="danger" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payments Received</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Cash" value={formatCurrency(figures.paymentsReceived.cash)} />
            <Stat label="Card" value={formatCurrency(figures.paymentsReceived.card)} />
            <Stat label="Bank" value={formatCurrency(figures.paymentsReceived.bank)} />
            <Stat label="Other" value={formatCurrency(figures.paymentsReceived.other)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Cash Expenses" value={formatCurrency(figures.expenses.cashExpenses)} tone="danger" />
            <Stat label="Bank Expenses" value={formatCurrency(figures.expenses.bankExpenses)} tone="danger" />
            <Stat label="Other Expenses" value={formatCurrency(figures.expenses.otherExpenses)} tone="danger" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Opening Cash" value={formatCurrency(figures.cash.openingCash)} />
          <Stat label="Cash Received" value={formatCurrency(figures.cash.cashReceived)} tone="success" />
          <Stat label="Cash Paid" value={formatCurrency(figures.cash.cashPaid)} tone="danger" />
          <Stat label="Adjustments" value={formatCurrency(figures.cash.cashAdjustments)} />
          <Stat label="Expected Closing" value={formatCurrency(figures.cash.expectedClosingCash)} tone="gold" />
          {record?.physicalCashAmount && (
            <Stat label="Physical Cash" value={formatCurrency(record.physicalCashAmount)} tone="gold" />
          )}
        </CardContent>
        {record?.cashDifference && Number(record.cashDifference) !== 0 && (
          <CardContent className="pt-0">
            <p className={`text-sm font-semibold ${Number(record.cashDifference) < 0 ? "text-danger" : "text-warning"}`}>
              {Number(record.cashDifference) < 0
                ? `CASH SHORTAGE: ${formatCurrency(Math.abs(Number(record.cashDifference)))}`
                : `CASH EXCESS: ${formatCurrency(record.cashDifference)}`}
            </p>
          </CardContent>
        )}
      </Card>

      {figures.gold.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gold</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {figures.gold.map((row) => (
              <div key={row.purity} className="grid grid-cols-3 gap-3 rounded-md border border-border bg-surface-elevated p-3 sm:grid-cols-6">
                <Stat label={PURITY_LABELS[row.purity]} value="" />
                <Stat label="Sold" value={formatWeight(row.goldSold)} />
                <Stat label="Purchased" value={formatWeight(row.goldPurchased)} />
                <Stat label="Received" value={formatWeight(row.goldReceived)} />
                <Stat label="Given" value={formatWeight(row.goldGiven)} />
                <Stat label="Returned" value={formatWeight(row.goldReturned)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Receivables</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Stat label="Opening" value={formatCurrency(figures.receivables.openingReceivable)} />
            <Stat label="New Credit Sales" value={formatCurrency(figures.receivables.newCreditSales)} />
            <Stat label="Payments Received" value={formatCurrency(figures.receivables.paymentsReceived)} tone="success" />
            <Stat label="Closing" value={formatCurrency(figures.receivables.closingReceivable)} tone="gold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier Payables</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Stat label="Opening" value={formatCurrency(figures.payables.openingPayable)} />
            <Stat label="New Purchases" value={formatCurrency(figures.payables.newPurchases)} />
            <Stat label="Payments Made" value={formatCurrency(figures.payables.paymentsMade)} tone="danger" />
            <Stat label="Closing" value={formatCurrency(figures.payables.closingPayable)} tone="gold" />
          </CardContent>
        </Card>
      </div>

      {status !== "CLOSED" && (
        <Card>
          <CardHeader>
            <CardTitle>Before closing</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyClosingIssues issues={figures.issues} />
          </CardContent>
        </Card>
      )}

      {canClose && (status === "OPEN" || status === "REOPENED") && (
        <SubmitDailyClosingForm businessDate={businessDateKey} expectedClosingCash={figures.cash.expectedClosingCash} />
      )}

      {canClose && status === "PENDING_REVIEW" && (
        <Card>
          <CardHeader>
            <CardTitle>Pending review</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              This day was submitted with unresolved issues above. An authorized user can close it anyway after
              reviewing them.
            </p>
            <div>
              <ConfirmDailyClosingButton businessDate={businessDateKey} />
            </div>
          </CardContent>
        </Card>
      )}

      {canReopen && status === "CLOSED" && (
        <Card>
          <CardHeader>
            <CardTitle>Reopen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Closed {record?.closedAt ? formatDateTime(record.closedAt) : ""}. Reopening requires a reason and is
              fully audited.
            </p>
            <div>
              <ReopenDailyClosingDialog businessDate={businessDateKey} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
