import Link from "next/link";
import { requireAccount } from "@/lib/require-auth";
import { getEquityCurve } from "@/lib/ledger";
import { toNumber, formatUsd } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  STARTING_CAPITAL: "Starting Capital",
  DEPOSIT: "Deposit",
  TRADE_PNL: "Trade P&L",
  WITHDRAWAL: "Withdrawal",
  FEE: "Fee",
  ADJUSTMENT: "Adjustment",
};

const TYPE_TONE: Record<string, "positive" | "negative" | "accent" | "neutral"> = {
  STARTING_CAPITAL: "accent",
  DEPOSIT: "positive",
  TRADE_PNL: "neutral",
  WITHDRAWAL: "negative",
  FEE: "negative",
  ADJUSTMENT: "neutral",
};

export default async function CapitalHistoryPage() {
  const { account } = await requireAccount();
  const transactions = await getEquityCurve(account.id);
  const reversed = [...transactions].reverse();

  let startingCapital = 0;
  let deposits = 0;
  let tradingProfit = 0;
  let tradingLoss = 0;
  let withdrawals = 0;
  let fees = 0;
  let adjustments = 0;

  for (const t of transactions) {
    const amt = t.amountUsd;
    if (t.type === "STARTING_CAPITAL") startingCapital += amt;
    else if (t.type === "DEPOSIT") deposits += amt;
    else if (t.type === "TRADE_PNL") {
      if (amt >= 0) tradingProfit += amt;
      else tradingLoss += Math.abs(amt);
    } else if (t.type === "WITHDRAWAL") withdrawals += Math.abs(amt);
    else if (t.type === "FEE") fees += Math.abs(amt);
    else if (t.type === "ADJUSTMENT") adjustments += amt;
  }

  const currentBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/wealth" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          <ArrowLeft size={12} /> Back to Wealth
        </Link>
        <h1 className="text-xl font-semibold">Capital History</h1>
        <p className="text-sm text-muted">A complete ledger-style history of every transaction affecting your trading balance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Starting Capital" value={formatUsd(startingCapital)} />
        <StatCard label="Deposits" value={formatUsd(deposits)} tone="positive" />
        <StatCard label="Trading Profit" value={formatUsd(tradingProfit)} tone="positive" />
        <StatCard label="Trading Loss" value={formatUsd(tradingLoss)} tone="negative" />
        <StatCard label="Withdrawals" value={formatUsd(withdrawals)} tone="negative" />
        <StatCard label="Trading Fees" value={formatUsd(fees)} tone="negative" />
        <StatCard label="Adjustments" value={formatUsd(adjustments, { showSign: true })} />
        <StatCard label="Current Balance" value={formatUsd(currentBalance)} tone="gold" />
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Amount</TH>
              <TH>Balance After</TH>
            </TR>
          </THead>
          <TBody>
            {reversed.map((t, i) => (
              <TR key={i}>
                <TD>{formatDateTime(t.date)}</TD>
                <TD>
                  <Badge variant={TYPE_TONE[t.type] ?? "neutral"}>{TYPE_LABELS[t.type] ?? t.type}</Badge>
                </TD>
                <TD className={t.amountUsd >= 0 ? "text-positive font-medium" : "text-negative font-medium"}>
                  {formatUsd(t.amountUsd, { showSign: true })}
                </TD>
                <TD className="font-medium">{formatUsd(t.balance)}</TD>
              </TR>
            ))}
            {reversed.length === 0 && (
              <TR>
                <TD colSpan={4} className="py-10 text-center text-muted">
                  No transactions yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
