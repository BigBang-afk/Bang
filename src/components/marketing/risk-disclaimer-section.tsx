import { AlertTriangle } from "lucide-react";

import { riskDisclaimer } from "@/lib/config/site";

export function RiskDisclaimerSection() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex gap-4 rounded-2xl border border-danger/30 bg-danger/5 p-6 sm:p-8">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
        <div>
          <h2 className="font-medium text-foreground">Risk disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {riskDisclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
