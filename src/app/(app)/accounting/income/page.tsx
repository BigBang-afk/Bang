import { userHasPermission, requireUser } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listIncomes } from "@/services/income.service";
import { Card, CardContent } from "@/components/ui/card";
import { AddIncomeDialog } from "@/components/accounting/add-income-dialog";
import { IncomeTable } from "@/components/accounting/income-table";
import type { FinancialEntryStatusValue, IncomeTypeValue } from "@/types/accounting";

export const metadata = { title: "Income | Zarghoon Jewellers" };

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const canManage = await userHasPermission(user, PERMISSIONS.ACCOUNTING_INCOME_MANAGE);

  const page = params.page ? Number(params.page) : 1;
  const { rows, total } = await listIncomes({
    incomeType: (params.incomeType as IncomeTypeValue) || undefined,
    status: (params.status as FinancialEntryStatusValue) || undefined,
    page,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Income</h1>
          <p className="text-sm text-muted-foreground">
            Standalone, non-POS income only — sales already flow through the POS system and are never duplicated
            here. {total} entr{total === 1 ? "y" : "ies"} recorded.
          </p>
        </div>
        {canManage && <AddIncomeDialog />}
      </div>

      <Card>
        <CardContent className="p-0">
          <IncomeTable rows={rows} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
