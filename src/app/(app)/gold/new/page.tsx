import { requireAccount } from "@/lib/require-auth";
import { toNumber } from "@/lib/money";
import { GoldForm } from "../gold-form";

export default async function NewGoldTransactionPage() {
  const { settings } = await requireAccount();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Buy Gold</h1>
        <p className="text-sm text-muted">Record a physical gold purchase or sale.</p>
      </div>
      <GoldForm usdToPkrRate={toNumber(settings.usdToPkrRate)} />
    </div>
  );
}
