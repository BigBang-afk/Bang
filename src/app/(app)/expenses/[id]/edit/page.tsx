import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { toDateInputValue } from "@/lib/utils";
import { ExpenseForm } from "../../expense-form";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account, settings } = await requireAccount();
  const expense = await prisma.expense.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit Expense</h1>
      </div>
      <ExpenseForm
        usdToPkrRate={toNumber(settings.usdToPkrRate)}
        initial={{
          id: expense.id,
          date: toDateInputValue(expense.date),
          category: expense.category,
          description: expense.description ?? "",
          amountPkr: toNumber(expense.amountPkr).toString(),
          paymentMethod: expense.paymentMethod ?? "",
          notes: expense.notes ?? "",
        }}
      />
    </div>
  );
}
