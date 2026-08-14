export const siteConfig = {
  name: "Lumenex",
  tagline: "AI-powered trading analytics, without the guesswork",
  description:
    "Lumenex turns raw market data into structured analysis, trade setups and risk management for crypto, forex, gold and index traders — with AI decision-support, not promises.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supportEmail: "support@lumenex.app",
};

export interface SupportedMarket {
  key: string;
  label: string;
  description: string;
}

// Markets the platform is designed to support. New markets are added here
// and in market_assets — never hard-coded into feature logic.
export const supportedMarkets: SupportedMarket[] = [
  { key: "crypto", label: "Crypto", description: "BTC, ETH and major pairs" },
  { key: "forex", label: "Forex", description: "Majors, minors & crosses" },
  { key: "metals", label: "Gold / XAUUSD", description: "Precious metals" },
  { key: "indices", label: "Indices", description: "S&P 500, Nasdaq & more" },
];

export const riskDisclaimer =
  "Lumenex provides market analysis and decision-support tools generated with the help of AI. Nothing on this platform is financial advice, and no output — including trade setups, confidence scores or AI analysis — should be read as a guarantee of accuracy or future performance. Trading leveraged products carries a high level of risk and may not be suitable for all investors. You are solely responsible for your own trading decisions.";
