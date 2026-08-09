import { requireAccount } from "@/lib/require-auth";
import { DepositForm } from "./deposit-form";

export default async function NewDepositPage() {
  await requireAccount();
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Deposit Funds</h1>
        <p className="text-sm text-muted">Add new capital to your trading account.</p>
      </div>
      <DepositForm />
    </div>
  );
}
