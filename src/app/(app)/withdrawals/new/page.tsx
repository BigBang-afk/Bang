import { requireAccount } from "@/lib/require-auth";
import { toNumber } from "@/lib/money";
import { getCurrentBalance } from "@/lib/ledger";
import { WithdrawalForm } from "../withdrawal-form";

export default async function NewWithdrawalPage() {
  const { account, settings } = await requireAccount();
  const balance = await getCurrentBalance(account.id);
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add Withdrawal</h1>
        <p className="text-sm text-muted">Record money taken out of your trading account.</p>
      </div>
      <WithdrawalForm usdToPkrRate={toNumber(settings.usdToPkrRate)} balance={balance} />
    </div>
  );
}
