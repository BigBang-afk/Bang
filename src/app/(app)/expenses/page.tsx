import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatPkr, formatUsd } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ExpenseRowActions } from "./expense-row-actions";
import { Plus } from "lucide-react";

export default async function ExpensesPage() {
  const { account } = await requireAccount();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = startOfDay.getDay();
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - ((day + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [expenses, dayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.expense.findMany({ where: { tradingAccountId: account.id }, orderBy: { date: "desc" } }),
    prisma.expense.aggregate({ where: { tradingAccountId: account.id, date: { gte: startOfDay } }, _sum: { amountPkr: true } }),
    prisma.expense.aggregate({ where: { tradingAccountId: account.id, date: { gte: startOfWeek } }, _sum: { amountPkr: true } }),
    prisma.expense.aggregate({ where: { tradingAccountId: account.id, date: { gte: startOfMonth } }, _sum: { amountPkr: true } }),
    prisma.expense.aggregate({ where: { tradingAccountId: account.id, date: { gte: startOfYear } }, _sum: { amountPkr: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted">Personal and business spending tracked separately from trading.</p>
        </div>
        <LinkButton href="/expenses/new" size="sm">
          <Plus size={16} /> Add Expense
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today" value={formatPkr(toNumber(dayAgg._sum.amountPkr))} tone="negative" />
        <StatCard label="This Week" value={formatPkr(toNumber(weekAgg._sum.amountPkr))} tone="negative" />
        <StatCard label="This Month" value={formatPkr(toNumber(monthAgg._sum.amountPkr))} tone="negative" />
        <StatCard label="This Year" value={formatPkr(toNumber(yearAgg._sum.amountPkr))} tone="negative" />
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Category</TH>
              <TH>Description</TH>
              <TH>PKR</TH>
              <TH>USD</TH>
              <TH>Payment</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {expenses.map((e) => (
              <TR key={e.id}>
                <TD>{formatDate(e.date)}</TD>
                <TD>
                  <Badge variant="neutral">{e.category.replace("_", " ")}</Badge>
                </TD>
                <TD className="max-w-48 truncate">{e.description ?? "—"}</TD>
                <TD className="font-medium text-negative">{formatPkr(toNumber(e.amountPkr))}</TD>
                <TD className="text-muted">{formatUsd(toNumber(e.usdEquivalent))}</TD>
                <TD className="text-muted">{e.paymentMethod ?? "—"}</TD>
                <TD>
                  <ExpenseRowActions id={e.id} />
                </TD>
              </TR>
            ))}
            {expenses.length === 0 && (
              <TR>
                <TD colSpan={7} className="py-10 text-center text-muted">
                  No expenses recorded yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
