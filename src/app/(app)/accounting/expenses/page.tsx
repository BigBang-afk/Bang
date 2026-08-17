import { userHasPermission, requireUser } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listExpenses } from "@/services/expense.service";
import { listAllExpenseCategories } from "@/services/expense-category.service";
import { getExpenseReport } from "@/services/financial-reports.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExpenseDialog } from "@/components/accounting/add-expense-dialog";
import { ManageExpenseCategoriesDialog } from "@/components/accounting/manage-expense-categories-dialog";
import { ExpenseFilters } from "@/components/accounting/expense-filters";
import { ExpenseTable } from "@/components/accounting/expense-table";
import { BarChartList } from "@/components/accounting/charts";
import { ExportCsvButton } from "@/components/accounting/export-csv-button";
import { exportExpenseReportAction } from "@/lib/actions/financial-reports.actions";
import { formatCurrency } from "@/lib/format";
import type { FinancialEntryStatusValue, ExpenseIncomePaymentMethodValue } from "@/types/accounting";

export const metadata = { title: "Expenses | Zarghoon Jewellers" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const [canCreate, canManage, canExport, categories, expenseReport] = await Promise.all([
    userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPENSES_CREATE),
    userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPENSES_MANAGE),
    userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPORT),
    listAllExpenseCategories(),
    getExpenseReport("this_month"),
  ]);

  const page = params.page ? Number(params.page) : 1;
  const { rows, total } = await listExpenses({
    categoryId: params.categoryId || undefined,
    paymentMethod: (params.paymentMethod as ExpenseIncomePaymentMethodValue) || undefined,
    status: (params.status as FinancialEntryStatusValue) || undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    page,
  });

  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">{total} recorded expense{total === 1 ? "" : "s"}.</p>
        </div>
        <div className="flex gap-2">
          {canManage && <ManageExpenseCategoriesDialog categories={categories} />}
          {canCreate && <AddExpenseDialog categories={activeCategories} />}
        </div>
      </div>

      <ExpenseFilters values={params} categories={categories} basePath="/accounting/expenses" />

      <Card>
        <CardContent className="p-0">
          <ExpenseTable rows={rows} canManage={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Expense Report — this month ({formatCurrency(expenseReport.totalExpenses)})</CardTitle>
          {canExport && (
            <ExportCsvButton action={exportExpenseReportAction} actionInput={{ preset: "this_month" }} filenamePrefix="expense-report" />
          )}
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By Category</p>
            <BarChartList items={expenseReport.byCategory.map((c) => ({ label: `${c.categoryName} (${c.count})`, value: Number(c.total) }))} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By Payment Method</p>
            <BarChartList items={expenseReport.byPaymentMethod.map((m) => ({ label: `${m.paymentMethod.replace("_", " ")} (${m.count})`, value: Number(m.total) }))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
