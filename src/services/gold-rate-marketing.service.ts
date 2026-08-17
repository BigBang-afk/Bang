import "server-only";
import { getEffectiveRatesForDate } from "@/services/gold-rate.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import { formatCurrency } from "@/lib/format";

/**
 * Gold-rate marketing content — see AI-MARKETING.md "Gold-rate marketing".
 * The rate shown in a GOLD_RATE_UPDATE campaign or the {{gold_rate}}
 * placeholder is ALWAYS read directly from Phase 1's gold-rate service at
 * the moment of use (campaign creation preview, and again at send time for
 * the queue's placeholder resolution) — never generated or guessed by the
 * AiProvider. See message-generator.service.ts, which never receives a
 * numeric rate in its `facts` for this reason.
 */

export type GoldRateNotice = { text: string; asOf: Date };

/** The default purity a shop typically advertises — 21K is the common retail-facing purity in Pakistan; callers may pass a different one. */
export async function buildGoldRateNotice(purity: "K24" | "K22" | "K21" | "K18" = "K21"): Promise<GoldRateNotice | null> {
  const rates = await getEffectiveRatesForDate(getTodayBusinessDate());
  const rate = rates.find((r) => r.purity === purity);
  if (!rate) return null;

  const asOf = new Date();
  const text = `${purity} gold rate: ${formatCurrency(rate.ratePerGram)} per gram (as of ${asOf.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })})`;
  return { text, asOf };
}

/** Same underlying real-rate lookup, formatted for the {{gold_rate}} placeholder specifically — a short phrase, not a full sentence. */
export async function getGoldRatePlaceholderValue(purity: "K24" | "K22" | "K21" | "K18" = "K21"): Promise<string | null> {
  const rates = await getEffectiveRatesForDate(getTodayBusinessDate());
  const rate = rates.find((r) => r.purity === purity);
  if (!rate) return null;
  return `${purity} gold rate is ${formatCurrency(rate.ratePerGram)} per gram`;
}
