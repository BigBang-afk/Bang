import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd, formatPkr } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getCurrentBalance } from "@/lib/ledger";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { WithdrawalRowActions } from "./withdrawal-row-actions";
import { Plus } from "lucide-react";

export default async function WithdrawalsPage() {
  const { account } = await requireAccount();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [withdrawals, balance, totalAgg, monthAgg] = await Promise.all([
    prisma.withdrawal.findMany({ where: { tradingAccountId: account.id }, orderBy: { date: "desc" } }),
    getCurrentBalance(account.id),
    prisma.withdrawal.aggregate({ where: { tradingAccountId: account.id }, _sum: { amountUsd: true } }),
    prisma.withdrawal.aggregate({
      where: { tradingAccountId: account.id, date: { gte: startOfMonth } },
      _sum: { amountUsd: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Withdrawals</h1>
          <p className="text-sm text-muted">Track capital taken out of your trading account.</p>
        </div>
        <LinkButton href="/withdrawals/new" size="sm">
          <Plus size={16} /> Add Withdrawal
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Withdrawn" value={formatUsd(toNumber(totalAgg._sum.amountUsd))} />
        <StatCard label="Total Remaining in Trading Account" value={formatUsd(balance)} tone="positive" />
        <StatCard label="Total Withdrawn This Month" value={formatUsd(toNumber(monthAgg._sum.amountUsd))} />
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>USD</TH>
              <TH>PKR Equivalent</TH>
              <TH>Destination</TH>
              <TH>Purpose</TH>
              <TH>Notes</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {withdrawals.map((w) => (
              <TR key={w.id}>
                <TD>{formatDate(w.date)}</TD>
                <TD className="font-medium">{formatUsd(toNumber(w.amountUsd))}</TD>
                <TD>{formatPkr(toNumber(w.pkrEquivalent))}</TD>
                <TD>
                  <Badge variant="accent">{w.destination.replace("_", " ")}</Badge>
                </TD>
                <TD className="text-muted">{w.purpose ?? "—"}</TD>
                <TD className="max-w-40 truncate text-muted">{w.notes ?? "—"}</TD>
                <TD>
                  <WithdrawalRowActions id={w.id} />
                </TD>
              </TR>
            ))}
            {withdrawals.length === 0 && (
              <TR>
                <TD colSpan={7} className="py-10 text-center text-muted">
                  No withdrawals recorded yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
