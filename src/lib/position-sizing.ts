export type RiskInstrument = "FOREX" | "CRYPTO" | "STOCKS" | "BINARY" | "OTHER";

export interface RiskCalcInput {
  accountBalance: number;
  riskPct: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number | null;
  instrument: RiskInstrument;
  /** Units per standard lot, forex only. Default 100,000 (standard lot). */
  contractSize?: number;
  /** Binary option payout percentage (e.g. 80 for 80%), binary only. */
  payoutPct?: number | null;
}

export interface RiskCalcResult {
  maxRiskUsd: number;
  positionSize: number;
  positionSizeLabel: string;
  units?: number;
  riskRewardRatio: number | null;
  potentialTpProfit: number | null;
  potentialSlLoss: number;
  error?: string;
}

/**
 * Instrument-specific position sizing. Forex uses a lot/contract-size model,
 * crypto/stocks/other use a direct price-distance model, binary options risk
 * the full stake (no price-distance sizing applies).
 */
export function calculateRiskPosition(input: RiskCalcInput): RiskCalcResult {
  const { accountBalance, riskPct, entryPrice, stopLoss, takeProfit, instrument } = input;
  const maxRiskUsd = accountBalance * (riskPct / 100);

  if (instrument === "BINARY") {
    const payoutPct = input.payoutPct ?? 80;
    const potentialTpProfit = maxRiskUsd * (payoutPct / 100);
    return {
      maxRiskUsd,
      positionSize: maxRiskUsd,
      positionSizeLabel: "Stake (USD)",
      riskRewardRatio: payoutPct / 100,
      potentialTpProfit,
      potentialSlLoss: maxRiskUsd,
    };
  }

  const slDistance = Math.abs(entryPrice - stopLoss);
  if (slDistance === 0 || !isFinite(slDistance)) {
    return {
      maxRiskUsd,
      positionSize: 0,
      positionSizeLabel: "N/A",
      riskRewardRatio: null,
      potentialTpProfit: null,
      potentialSlLoss: 0,
      error: "Entry price and stop loss cannot be equal.",
    };
  }

  const units = maxRiskUsd / slDistance;
  const tpDistance =
    takeProfit !== null && takeProfit !== undefined ? Math.abs(takeProfit - entryPrice) : null;
  const riskRewardRatio = tpDistance !== null ? tpDistance / slDistance : null;
  const potentialTpProfit = tpDistance !== null ? units * tpDistance : null;

  if (instrument === "FOREX") {
    const contractSize = input.contractSize ?? 100000;
    const lots = units / contractSize;
    return {
      maxRiskUsd,
      positionSize: lots,
      positionSizeLabel: "Lots",
      units,
      riskRewardRatio,
      potentialTpProfit,
      potentialSlLoss: maxRiskUsd,
    };
  }

  const label =
    instrument === "CRYPTO" ? "Coins/Units" : instrument === "STOCKS" ? "Shares" : "Units";

  return {
    maxRiskUsd,
    positionSize: units,
    positionSizeLabel: label,
    riskRewardRatio,
    potentialTpProfit,
    potentialSlLoss: maxRiskUsd,
  };
}

export interface CompoundingRow {
  day: number;
  startingBalance: number;
  targetProfit: number;
  withdrawal: number;
  endingBalance: number;
}

export function computeCompoundingTable(
  startingBalance: number,
  targetPct: number,
  days: number,
  withdrawalPct = 0
): CompoundingRow[] {
  const rows: CompoundingRow[] = [];
  let balance = startingBalance;
  for (let day = 1; day <= days; day++) {
    const startOfDay = balance;
    const targetProfit = startOfDay * (targetPct / 100);
    const afterProfit = startOfDay + targetProfit;
    const withdrawal = afterProfit * (withdrawalPct / 100);
    const endingBalance = afterProfit - withdrawal;
    rows.push({ day, startingBalance: startOfDay, targetProfit, withdrawal, endingBalance });
    balance = endingBalance;
  }
  return rows;
}
