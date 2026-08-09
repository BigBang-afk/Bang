"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { computeCompoundingTable } from "@/lib/position-sizing";
import { formatUsd } from "@/lib/money";
import { AlertTriangle } from "lucide-react";

export function CompoundingCalculator({ defaultBalance }: { defaultBalance: number }) {
  const [startingBalance, setStartingBalance] = useState(String(defaultBalance.toFixed(2)));
  const [targetPct, setTargetPct] = useState("2");
  const [days, setDays] = useState("20");
  const [withdrawalPct, setWithdrawalPct] = useState("0");

  const rows = useMemo(() => {
    const d = Math.min(365, Math.max(1, Number(days) || 1));
    return computeCompoundingTable(Number(startingBalance) || 0, Number(targetPct) || 0, d, Number(withdrawalPct) || 0);
  }, [startingBalance, targetPct, days, withdrawalPct]);

  const finalBalance = rows.length > 0 ? rows[rows.length - 1].endingBalance : 0;
  const totalWithdrawn = rows.reduce((s, r) => s + r.withdrawal, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compounding Calculator</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <FormField label="Starting Balance (USD)">
            <Input type="number" step="any" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
          </FormField>
          <FormField label="Target % per Day">
            <Input type="number" step="any" value={targetPct} onChange={(e) => setTargetPct(e.target.value)} />
          </FormField>
          <FormField label="Number of Trading Days">
            <Input type="number" step="1" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} />
          </FormField>
          <FormField label="Withdrawal % (optional)">
            <Input type="number" step="any" value={withdrawalPct} onChange={(e) => setWithdrawalPct(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted">Projected Ending Balance</p>
          <p className="text-lg font-semibold text-positive">{formatUsd(finalBalance)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Total Withdrawn</p>
          <p className="text-lg font-semibold">{formatUsd(totalWithdrawn)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Growth</p>
          <p className="text-lg font-semibold text-gold">
            {startingBalance && Number(startingBalance) > 0 ? `${(((finalBalance - Number(startingBalance)) / Number(startingBalance)) * 100).toFixed(1)}%` : "—"}
          </p>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold-bg px-4 py-3 text-sm text-gold">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        This is a mathematical projection, not a guarantee of future trading returns.
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Day</TH>
              <TH>Starting Balance</TH>
              <TH>Target Profit</TH>
              <TH>Withdrawal</TH>
              <TH>Ending Balance</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.day}>
                <TD>{r.day}</TD>
                <TD>{formatUsd(r.startingBalance)}</TD>
                <TD className="text-positive">{formatUsd(r.targetProfit)}</TD>
                <TD className="text-muted">{formatUsd(r.withdrawal)}</TD>
                <TD className="font-medium">{formatUsd(r.endingBalance)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
