import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { TickerTape } from "@/components/tradingview/ticker-tape";
import { Hero } from "@/components/site/hero";
import { Stats } from "@/components/site/stats";
import { Features } from "@/components/site/features";
import { MarketsSection } from "@/components/site/markets-section";
import { Pricing } from "@/components/site/pricing";
import { CtaBanner } from "@/components/site/cta-banner";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="border-b border-border-subtle bg-background-elevated py-2">
          <TickerTape />
        </div>
        <Hero />
        <Stats />
        <Features />
        <MarketsSection />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
