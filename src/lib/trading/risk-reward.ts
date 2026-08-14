/**
 * Pure risk/reward math shared by the setups form and the risk calculator.
 * No market data, no database — just arithmetic on the numbers the user
 * typed in, so it's exhaustively unit-testable and identical wherever it's
 * used.
 */

export type Direction = "long" | "short";

export interface RiskRewardInput {
  direction: Direction;
  entry: number;
  stopLoss: number;
  /** Ordered take-profit targets, e.g. [tp1, tp2]. May be empty. */
  takeProfits: number[];
}

export interface TakeProfitResult {
  price: number;
  /** Absolute price distance from entry to this target. */
  rewardDistance: number;
  /** rewardDistance / stopDistance. */
  riskRewardRatio: number;
  /** False when this target sits on the wrong side of entry for the stated direction. */
  onCorrectSide: boolean;
}

export interface RiskRewardWarning {
  code: "stop_wrong_side" | "take_profit_wrong_side" | "take_profit_before_stop_distance";
  message: string;
}

export interface RiskRewardResult {
  stopDistance: number;
  takeProfitResults: TakeProfitResult[];
  /** The first take-profit's ratio — what "risk/reward" means when a setup lists just one. */
  primaryRiskRewardRatio: number | null;
  warnings: RiskRewardWarning[];
}

export class RiskRewardInputError extends Error {}

/**
 * Computes stop distance and, for each take-profit, the reward distance and
 * risk/reward ratio. Distances are always magnitudes (never negative) so a
 * ratio is meaningful regardless of direction; direction is used only to
 * flag stops/targets on the wrong side of entry — a warning, not a thrown
 * error, since a user mid-way through filling out a form has a right to see
 * a stop on the "wrong" side without the tool refusing to compute anything.
 */
export function computeRiskReward(input: RiskRewardInput): RiskRewardResult {
  const { direction, entry, stopLoss, takeProfits } = input;

  if (!Number.isFinite(entry) || entry <= 0) {
    throw new RiskRewardInputError("Entry price must be a positive number.");
  }
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    throw new RiskRewardInputError("Stop-loss price must be a positive number.");
  }
  if (entry === stopLoss) {
    throw new RiskRewardInputError("Stop-loss can't equal the entry price.");
  }

  const stopDistance = Math.abs(entry - stopLoss);
  const warnings: RiskRewardWarning[] = [];

  const stopOnCorrectSide = direction === "long" ? stopLoss < entry : stopLoss > entry;
  if (!stopOnCorrectSide) {
    warnings.push({
      code: "stop_wrong_side",
      message:
        direction === "long"
          ? "For a long, the stop-loss is usually below entry."
          : "For a short, the stop-loss is usually above entry.",
    });
  }

  const takeProfitResults: TakeProfitResult[] = takeProfits
    .filter((tp) => Number.isFinite(tp) && tp > 0)
    .map((tp) => {
      const onCorrectSide = direction === "long" ? tp > entry : tp < entry;
      if (!onCorrectSide) {
        warnings.push({
          code: "take_profit_wrong_side",
          message:
            direction === "long"
              ? `Take-profit ${tp} is below entry — unusual for a long.`
              : `Take-profit ${tp} is above entry — unusual for a short.`,
        });
      }
      const rewardDistance = Math.abs(tp - entry);
      return {
        price: tp,
        rewardDistance,
        riskRewardRatio: rewardDistance / stopDistance,
        onCorrectSide,
      };
    });

  return {
    stopDistance,
    takeProfitResults,
    primaryRiskRewardRatio: takeProfitResults[0]?.riskRewardRatio ?? null,
    warnings,
  };
}
