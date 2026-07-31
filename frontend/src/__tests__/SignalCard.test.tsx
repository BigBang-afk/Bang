import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignalCard } from "@/components/signals/SignalCard";
import type { Signal } from "@/types";

const baseSignal: Signal = {
  public_signal_id: "SIG-TEST0001",
  asset_symbol: "EUR/USD",
  strategy_code: "ema_trend_pullback",
  strategy_name: "EMA Trend Pullback",
  direction: "CALL",
  timeframe: "1m",
  expiry_seconds: 60,
  generated_at: new Date().toISOString(),
  entry_time: new Date(Date.now() + 1000).toISOString(),
  entry_window_end: new Date(Date.now() + 6000).toISOString(),
  entry_price: 1.0855,
  expiry_time: new Date(Date.now() + 61000).toISOString(),
  expiry_price: null,
  confidence: 78.5,
  confidence_type: "rule_based",
  market_condition: "strong_bullish_trend",
  status: "ACTIVE",
  result: "PENDING",
  strategy_version: 1,
  model_version: null,
  provider: "mock",
  data_latency_ms: 12,
  ai_auto_mode: false,
  supporting_strategies: [],
  reasons: [{ reason_code: "ema_stack_bullish", reason_text: "EMA9 > EMA21 > EMA50", score: 1 }],
};

describe("SignalCard", () => {
  it("renders the asset, strategy, direction and confidence", () => {
    render(<SignalCard signal={baseSignal} />);
    expect(screen.getByText("EUR/USD")).toBeInTheDocument();
    expect(screen.getByText("EMA Trend Pullback")).toBeInTheDocument();
    expect(screen.getByText("CALL")).toBeInTheDocument();
    expect(screen.getByText(/78.5%/)).toBeInTheDocument();
  });

  it("shows the top signal reason text", () => {
    render(<SignalCard signal={baseSignal} />);
    expect(screen.getByText(/EMA9 > EMA21 > EMA50/)).toBeInTheDocument();
  });

  it("never shows a fabricated 100% or guaranteed confidence claim", () => {
    render(<SignalCard signal={baseSignal} />);
    expect(screen.queryByText(/guarantee/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  });
});
