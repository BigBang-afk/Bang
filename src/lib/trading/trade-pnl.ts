/**
 * Pure P/L math for a closed trade journal entry. Kept separate from
 * risk-reward.ts (which is about planning a trade before it happens) —
 * this is about scoring one that already closed.
 */

import { RiskRewardInputError, type Direction } from "@/lib/trading/risk-reward";

export interface TradePnlInput {
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  /** Trading fees paid, in cents — subtracted from the gross P/L. */
  feesCents?: number;
}

export interface TradePnlResult {
  /** Net of fees, rounded to the nearest cent. */
  pnlCents: number;
  /** Gross return on notional (entryPrice * positionSize), before fees. */
  pnlPercent: number;
}

export function computeTradePnl(input: TradePnlInput): TradePnlResult {
  const { direction, entryPrice, exitPrice, positionSize, feesCents = 0 } = input;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    throw new RiskRewardInputError("Entry price must be a positive number.");
  }
  if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
    throw new RiskRewardInputError("Exit price must be a positive number.");
  }
  if (!Number.isFinite(positionSize) || positionSize <= 0) {
    throw new RiskRewardInputError("Position size must be a positive number.");
  }

  const grossPnl =
    direction === "long"
      ? (exitPrice - entryPrice) * positionSize
      : (entryPrice - exitPrice) * positionSize;

  const notional = entryPrice * positionSize;
  const pnlCents = Math.round(grossPnl * 100) - Math.round(feesCents);
  const pnlPercent = (grossPnl / notional) * 100;

  return { pnlCents, pnlPercent };
}
