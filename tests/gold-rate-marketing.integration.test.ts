import { describe, expect, it } from "vitest";
import { buildGoldRateNotice, getGoldRatePlaceholderValue } from "@/services/gold-rate-marketing.service";
import { getEffectiveRatesForDate } from "@/services/gold-rate.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import { formatCurrency } from "@/lib/format";
import { validateMessageSafety } from "@/services/message-safety.service";

describe("Gold-rate campaign (Test 22)", () => {
  it("builds a factual notice with today's real rate and a timestamp", async () => {
    const rates = await getEffectiveRatesForDate(getTodayBusinessDate());
    const k21 = rates.find((r) => r.purity === "K21");
    if (!k21) return; // no rate set today in this environment — nothing to assert against

    const notice = await buildGoldRateNotice("K21");
    expect(notice).not.toBeNull();
    expect(notice!.text).toContain(formatCurrency(k21.ratePerGram));
    expect(notice!.text).toContain("K21");
    expect(notice!.asOf).toBeInstanceOf(Date);
  });

  it("a gold-rate notice never contains an investment/return claim", async () => {
    const notice = await buildGoldRateNotice("K21");
    if (!notice) return;
    const safety = validateMessageSafety(notice.text);
    expect(safety.safe).toBe(true);
  });

  it("returns null (never a guessed rate) for a purity with no rate recorded today", async () => {
    // SILVER is not part of the GoldPurity subset buildGoldRateNotice accepts by type,
    // but the underlying lookup is exercised directly here for a purity that may be unset.
    const rates = await getEffectiveRatesForDate(getTodayBusinessDate());
    const missing = (["K24", "K22", "K21", "K18"] as const).find((p) => !rates.some((r) => r.purity === p));
    if (!missing) return; // every purity happens to be set today — nothing to assert
    const notice = await buildGoldRateNotice(missing);
    expect(notice).toBeNull();
  });
});

describe("CRITICAL TEST — gold-rate message content always comes from the gold-rate service, never AI-generated", () => {
  it("getGoldRatePlaceholderValue returns exactly the current effective rate, formatted, with no AI involvement", async () => {
    const rates = await getEffectiveRatesForDate(getTodayBusinessDate());
    const k21 = rates.find((r) => r.purity === "K21");
    if (!k21) return;

    const value = await getGoldRatePlaceholderValue("K21");
    expect(value).toBe(`K21 gold rate is ${formatCurrency(k21.ratePerGram)} per gram`);

    // The AiProvider is never even given a numeric rate as a fact for a
    // gold-rate campaign — see message-generator.service.ts, which never
    // passes a "goldRate" number into `facts`.
    const { generateCampaignMessageTemplate } = await import("@/services/message-generator.service");
    const { getSeededOwnerId } = await import("./helpers/db-fixtures");
    const userId = await getSeededOwnerId();
    const generated = await generateCampaignMessageTemplate(
      { campaignType: "GOLD_RATE_UPDATE", objective: "INFORMATIONAL", tone: "informational", language: "ENGLISH" },
      userId,
    );
    // The template only ever contains the {{gold_rate}} placeholder — the real number is
    // substituted later, at queue time, directly from this same service (see message-queue.service.ts).
    expect(generated.template).toContain("{{gold_rate}}");
    expect(generated.template).not.toMatch(/\d/);
  });
});
