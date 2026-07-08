import { Direction } from "@/lib/types";
import { ConditionScores } from "./conditions";

export function buildReason(direction: Direction, scores: ConditionScores): string {
  const m = scores.meta;
  const bullish = direction === "CALL";

  const clauses: string[] = [];

  if (!Number.isNaN(m.ema50)) {
    clauses.push(
      bullish ? "price is trading above EMA 50" : "price is trading below EMA 50"
    );
  }

  if (!Number.isNaN(m.ema5) && !Number.isNaN(m.ema20)) {
    clauses.push(
      bullish ? "EMA 5 has crossed above EMA 20" : "EMA 5 has crossed below EMA 20"
    );
  }

  if (!Number.isNaN(m.rsiValue)) {
    clauses.push(bullish ? "RSI is bullish above 50" : "RSI is bearish below 50");
  }

  if (m.breakoutDir !== "none") {
    clauses.push(
      m.breakoutDir === "bullish"
        ? "a bullish breakout of recent structure"
        : "a bearish breakdown of recent structure"
    );
  } else if (m.retestDir !== "none") {
    clauses.push(
      m.retestDir === "bullish" ? "a confirmed breakout retest" : "a confirmed breakdown retest"
    );
  } else if (m.sweepDir !== "none") {
    clauses.push(
      m.sweepDir === "bullish"
        ? "a liquidity sweep below support before reversing up"
        : "a liquidity sweep above resistance before reversing down"
    );
  } else if (
    bullish &&
    m.nearestSupport !== null &&
    Math.abs(scores.supportResistance) > 0.2 &&
    scores.supportResistance > 0
  ) {
    clauses.push("the latest candle shows strong buying pressure from support");
  } else if (
    !bullish &&
    m.nearestResistance !== null &&
    Math.abs(scores.supportResistance) > 0.2 &&
    scores.supportResistance < 0
  ) {
    clauses.push("the latest candle shows rejection from resistance");
  } else {
    clauses.push(
      bullish
        ? "the latest candle shows strong buying pressure"
        : "the latest candle shows strong selling pressure"
    );
  }

  const prefix = bullish ? "CALL signal because" : "PUT signal because";
  const joined =
    clauses.length > 1
      ? `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`
      : clauses[0];

  return `${prefix} ${joined}.`;
}
