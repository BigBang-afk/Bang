/**
 * Pure position-sizing math for /dashboard/risk-calculator. Built on top of
 * risk-reward.ts (stop distance / reward / R:R) and adds the one thing that
 * needs real-world data to compute safely: position size, which requires
 * knowing the dollar value of one point of price movement for one raw unit
 * of the instrument — a "contract specification."
 */

import {
  RiskRewardInputError,
  computeRiskReward,
  type Direction,
  type RiskRewardWarning,
} from "@/lib/trading/risk-reward";
import type { MarketType } from "@/types/database";

export { RiskRewardInputError as RiskCalculatorInputError };

/**
 * Market types this app can safely treat as "1 raw unit moves $1 per $1 of
 * price change" — crypto (1 coin), the forex pairs this app tracks (quoted
 * directly in USD), and stocks (1 share). Metals and indices are
 * deliberately excluded: this app has no source of contract/point-value
 * specifications for leveraged metals or index CFDs/futures (a real gold
 * future is 100 oz/contract; a real index CFD's $-per-point varies by
 * broker and contract), and assuming 1 would be exactly the fabricated
 * number the brief prohibits. Extend this only when a specific instrument's
 * real contract spec is sourced — never as a blanket per-market-type
 * assumption.
 */
const DIRECT_UNIT_VALUE_MARKET_TYPES: MarketType[] = ["crypto", "forex", "stocks"];

export interface RiskCalculatorInput {
  accountBalance: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  /** null when the user hasn't set a target yet. */
  takeProfit: number | null;
  positionType: Direction;
  /** null when no instrument is selected, or the instrument isn't in market_assets. */
  marketType: MarketType | null;
  symbol: string | null;
}

export interface RiskCalculatorResult {
  dollarRisk: number;
  riskPercent: number;
  stopDistance: number;
  reward: number | null;
  riskRewardRatio: number | null;
  positionSize: number | null;
  /** Set (and positionSize left null) whenever sizing would require guessing a contract spec. */
  positionSizeUnavailableReason: string | null;
  warnings: RiskRewardWarning[];
}

export function calculateRisk(input: RiskCalculatorInput): RiskCalculatorResult {
  const { accountBalance, riskPercent, entry, stopLoss, takeProfit, positionType, marketType, symbol } =
    input;

  if (!Number.isFinite(accountBalance) || accountBalance <= 0) {
    throw new RiskRewardInputError("Account balance must be a positive number.");
  }
  if (!Number.isFinite(riskPercent) || riskPercent <= 0 || riskPercent > 100) {
    throw new RiskRewardInputError("Risk percentage must be greater than 0 and at most 100.");
  }

  const takeProfits =
    takeProfit !== null && Number.isFinite(takeProfit) && takeProfit > 0 ? [takeProfit] : [];
  const rr = computeRiskReward({ direction: positionType, entry, stopLoss, takeProfits });

  const dollarRisk = accountBalance * (riskPercent / 100);
  const reward = rr.takeProfitResults[0]?.rewardDistance ?? null;

  let positionSize: number | null = null;
  let positionSizeUnavailableReason: string | null = null;

  const unitValue = marketType && DIRECT_UNIT_VALUE_MARKET_TYPES.includes(marketType) ? 1 : null;
  if (unitValue !== null) {
    positionSize = dollarRisk / (rr.stopDistance * unitValue);
  } else if (marketType) {
    positionSizeUnavailableReason = `Position size can't be safely calculated: this app doesn't have a contract/point-value specification for ${symbol ?? "this instrument"} (${marketType}). Dollar risk, stop distance, reward and risk/reward ratio above don't depend on that and are still accurate.`;
  } else {
    positionSizeUnavailableReason =
      "Select an instrument to calculate position size. Dollar risk, stop distance, reward and risk/reward ratio don't need one.";
  }

  return {
    dollarRisk,
    riskPercent,
    stopDistance: rr.stopDistance,
    reward,
    riskRewardRatio: rr.primaryRiskRewardRatio,
    positionSize,
    positionSizeUnavailableReason,
    warnings: rr.warnings,
  };
}
