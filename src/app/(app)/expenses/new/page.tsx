import { requireAccount } from "@/lib/require-auth";
import { toNumber } from "@/lib/money";
import { ExpenseForm } from "../expense-form";

export default async function NewExpensePage() {
  const { settings } = await requireAccount();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add Expense</h1>
        <p className="text-sm text-muted">Track personal or business spending.</p>
      </div>
      <ExpenseForm usdToPkrRate={toNumber(settings.usdToPkrRate)} />
    </div>
  );
}
