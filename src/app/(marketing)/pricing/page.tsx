import type { Metadata } from "next";

import { Cta } from "@/components/marketing/cta";
import { Faq } from "@/components/marketing/faq";
import { PricingSection } from "@/components/marketing/pricing-section";
import { RiskDisclaimerSection } from "@/components/marketing/risk-disclaimer-section";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for traders — Free, Starter, Pro and Elite.",
};

export default function PricingPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Pricing</h1>
        <p className="mt-4 text-muted-foreground">
          Pick a plan that matches how often you trade. Every plan starts with a clear
          limit, so there are no surprises.
        </p>
      </div>
      <PricingSection id="pricing-table" />
      <Faq />
      <RiskDisclaimerSection />
      <Cta />
    </>
  );
}
