import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber, formatUsd, formatPkr, formatGrams } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AllocationRuleForm } from "./allocation-rule-form";
import { AllocationPreview } from "./allocation-preview";
import { AddTransferButton, DeleteTransferButton } from "./transfer-modal";

export default async function AllocationPage() {
  const { account, settings } = await requireAccount();

  const [rule, transfers, tradeAgg] = await Promise.all([
    prisma.profitAllocationRule.findUnique({ where: { tradingAccountId: account.id } }),
    prisma.allocationTransfer.findMany({ where: { tradingAccountId: account.id }, orderBy: { date: "desc" } }),
    prisma.trade.aggregate({ where: { tradingAccountId: account.id, deletedAt: null }, _sum: { netPnlUsd: true } }),
  ]);

  const ruleValues = {
    tradingCapitalPct: rule ? toNumber(rule.tradingCapitalPct) : 30,
    goldPct: rule ? toNumber(rule.goldPct) : 30,
    savingsPct: rule ? toNumber(rule.savingsPct) : 15,
    businessPct: rule ? toNumber(rule.businessPct) : 10,
    realEstatePct: rule ? toNumber(rule.realEstatePct) : 10,
    personalPct: rule ? toNumber(rule.personalPct) : 5,
    otherPct: rule ? toNumber(rule.otherPct) : 0,
    otherLabel: rule?.otherLabel ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profit Allocation</h1>
        <p className="text-sm text-muted">Decide where your trading profits go, then confirm actual transfers as you make them.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AllocationRuleForm
          initial={{
            tradingCapitalPct: String(ruleValues.tradingCapitalPct),
            goldPct: String(ruleValues.goldPct),
            savingsPct: String(ruleValues.savingsPct),
            businessPct: String(ruleValues.businessPct),
            realEstatePct: String(ruleValues.realEstatePct),
            personalPct: String(ruleValues.personalPct),
            otherPct: String(ruleValues.otherPct),
            otherLabel: ruleValues.otherLabel,
          }}
        />
        <AllocationPreview
          rule={ruleValues}
          defaultAmount={toNumber(tradeAgg._sum.netPnlUsd)}
          usdToPkrRate={toNumber(settings.usdToPkrRate)}
          goldPricePerGramPkr={toNumber(settings.goldPricePerGramPkr)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actual Transfers Completed</CardTitle>
          <AddTransferButton />
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Category</TH>
              <TH>USD</TH>
              <TH>PKR</TH>
              <TH>Gold (g)</TH>
              <TH>Notes</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {transfers.map((t) => (
              <TR key={t.id}>
                <TD>{formatDate(t.date)}</TD>
                <TD>
                  <Badge variant="gold">{t.category.replace("_", " ")}</Badge>
                </TD>
                <TD className="font-medium">{formatUsd(toNumber(t.amountUsd))}</TD>
                <TD>{formatPkr(toNumber(t.pkrEquivalent))}</TD>
                <TD className="text-gold">{t.goldGrams ? formatGrams(toNumber(t.goldGrams), { valueOnly: true }) : "—"}</TD>
                <TD className="max-w-40 truncate text-muted">{t.notes ?? "—"}</TD>
                <TD>
                  <DeleteTransferButton id={t.id} />
                </TD>
              </TR>
            ))}
            {transfers.length === 0 && (
              <TR>
                <TD colSpan={7} className="py-10 text-center text-muted">
                  No confirmed transfers yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
