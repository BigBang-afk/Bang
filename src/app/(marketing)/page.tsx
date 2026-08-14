import { Cta } from "@/components/marketing/cta";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProductExplanation } from "@/components/marketing/product-explanation";
import { RiskDisclaimerSection } from "@/components/marketing/risk-disclaimer-section";
import { SupportedMarkets } from "@/components/marketing/supported-markets";

export default function HomePage() {
  return (
    <>
      <Hero />
      <DashboardPreview />
      <ProductExplanation />
      <Features />
      <HowItWorks />
      <SupportedMarkets />
      <PricingSection />
      <Faq />
      <RiskDisclaimerSection />
      <Cta />
    </>
  );
}
