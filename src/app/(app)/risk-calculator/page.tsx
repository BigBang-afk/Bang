import { requireAccount } from "@/lib/require-auth";
import { getCurrentBalance } from "@/lib/ledger";
import { Tabs } from "@/components/ui/tabs";
import { PositionSizeCalculator } from "./position-size-calculator";
import { CompoundingCalculator } from "./compounding-calculator";

export default async function RiskCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { account } = await requireAccount();
  const balance = await getCurrentBalance(account.id);
  const activeTab = tab ?? "position";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Risk & Compounding Calculators</h1>
        <p className="text-sm text-muted">Size your positions safely and project account growth.</p>
      </div>

      <Tabs
        tabs={[
          { value: "position", label: "Position Size" },
          { value: "compounding", label: "Compounding" },
        ]}
        defaultTab="position"
      />

      {activeTab === "position" && <PositionSizeCalculator defaultBalance={balance} />}
      {activeTab === "compounding" && <CompoundingCalculator defaultBalance={balance} />}
    </div>
  );
}
