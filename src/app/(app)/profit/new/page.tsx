import { requireAccount } from "@/lib/require-auth";
import { toNumber } from "@/lib/money";
import { ProfitEntryForm } from "./profit-entry-form";

export default async function NewProfitEntryPage() {
  const { settings } = await requireAccount();
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Quick Profit / Loss Entry</h1>
        <p className="text-sm text-muted">Log a profit or loss without a full trade record.</p>
      </div>
      <ProfitEntryForm usdToPkrRate={toNumber(settings.usdToPkrRate)} goldPricePerGramPkr={toNumber(settings.goldPricePerGramPkr)} />
    </div>
  );
}
