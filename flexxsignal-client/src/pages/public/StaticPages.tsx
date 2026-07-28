function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="page-heading mb-8">{title}</h1>
      <div className="prose prose-invert prose-sm max-w-none space-y-4 text-slate-300 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <LegalPage title="About FlexX Signal">
      <p>
        FlexX Signal is a signal-and-analysis platform for binary-options traders. Our signal engine analyzes candle
        structure, momentum, support/resistance zones, breakouts, liquidity sweeps and multi-timeframe agreement to
        surface high-confidence directional signals.
      </p>
      <p>
        We are strictly a signal and analysis platform. We do not execute trades on any exchange or broker, and we
        never request or store your trading-platform login credentials, cookies, or session tokens.
      </p>
      <p>
        Every signal we publish is tracked to a verified result — win, loss or tie — and shown transparently in our
        performance history and public statistics. We never edit a losing trade to improve our numbers.
      </p>
    </LegalPage>
  );
}

export function RiskDisclosurePage() {
  return (
    <LegalPage title="Risk Disclosure">
      <p>
        Binary options trading carries a high level of risk and may not be suitable for all investors. Past
        performance, including any win rate or confidence statistic shown on this platform, is not indicative of
        future results.
      </p>
      <p>
        FlexX Signal provides analysis and "High Confidence Signal" indicators based on a weighted, calibrated
        scoring system. A high confidence score is not a guarantee of a winning outcome, and no signal on this
        platform should be interpreted as a certainty of profit.
      </p>
      <p>
        You are solely responsible for any trading decisions you make. Only trade with funds you can afford to
        lose, and consider seeking independent financial advice before trading.
      </p>
      <p>
        FlexX Signal does not execute trades, hold funds, or have access to any trading account. All demo data used
        for development and testing is clearly labeled "DEMO DATA" and must never be mistaken for live market
        pricing.
      </p>
    </LegalPage>
  );
}

export function TermsPrivacyPage() {
  return (
    <LegalPage title="Terms of Service &amp; Privacy Policy">
      <h2 className="text-slate-100 font-semibold text-base mt-6">Terms of Service</h2>
      <p>
        By using FlexX Signal you agree that the platform provides signals and analysis for informational purposes
        only, that no outcome is guaranteed, and that you will not hold FlexX Signal liable for any trading losses
        incurred based on our signals.
      </p>
      <h2 className="text-slate-100 font-semibold text-base mt-6">Privacy Policy</h2>
      <p>
        We collect only the account information necessary to operate the platform: your email address, display
        name, and usage data related to signals and subscriptions. We never collect or store third-party trading
        platform credentials, cookies, or session tokens.
      </p>
      <p>
        Passwords are hashed using ASP.NET Core Identity's secure hashing algorithm and are never stored or
        transmitted in plain text. You may request account deletion at any time through Support.
      </p>
    </LegalPage>
  );
}
