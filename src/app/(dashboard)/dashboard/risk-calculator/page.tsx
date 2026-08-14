import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { RiskCalculatorForm } from "@/components/dashboard/risk-calculator-form";

export const metadata: Metadata = { title: "Risk Calculator" };

export default function RiskCalculatorPage() {
  return (
    <div>
      <PageHeader
        title="Risk Calculator"
        description="Size a position based on your account risk, entry and stop-loss. Purely a calculation tool — it doesn't place trades."
      />
      <RiskCalculatorForm />
    </div>
  );
}
