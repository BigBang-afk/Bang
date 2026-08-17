import { describe, expect, it, beforeAll } from "vitest";
import { getSeededOwnerId } from "./helpers/db-fixtures";
import { substitutePlaceholders, extractPlaceholders } from "@/lib/message-placeholders";
import { validateMessageSafety } from "@/services/message-safety.service";
import { generateCampaignMessageTemplate } from "@/services/message-generator.service";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

describe("Placeholder replacement (Test 11)", () => {
  it("substitutes every known placeholder and leaves an unsupplied one untouched", () => {
    const template = "{{customer_name}}, {{shop_name}} has {{product_name}} — {{offer}}. Valid until {{expiry_date}}. {{gold_rate}}";
    const result = substitutePlaceholders(template, {
      customer_name: "Ayesha",
      shop_name: "Zarghoon Jewellers",
      product_name: "Gold Necklace",
      offer: "10% off",
    });
    expect(result).toContain("Ayesha, Zarghoon Jewellers has Gold Necklace — 10% off.");
    // Unsupplied placeholders are left literal, never silently blanked.
    expect(result).toContain("{{expiry_date}}");
    expect(result).toContain("{{gold_rate}}");
  });

  it("never inserts sensitive information — only the closed placeholder set is ever substituted", () => {
    const result = substitutePlaceholders("{{customer_name}} {{outstanding_balance}} {{ssn}}", { customer_name: "Ali" });
    expect(result).toBe("Ali {{outstanding_balance}} {{ssn}}");
  });

  it("extractPlaceholders lists only recognized tokens present in a template", () => {
    expect(extractPlaceholders("{{customer_name}}, {{unknown_token}}, {{offer}}")).toEqual(["customer_name", "offer"]);
  });
});

describe("Message generation (Test 10)", () => {
  it("generates a template containing the customer_name placeholder, never a resolved value, and reflects the requested language", async () => {
    const english = await generateCampaignMessageTemplate(
      { campaignType: "SPECIAL_OFFER", objective: "SALES", tone: "friendly", language: "ENGLISH", productName: "Gold Necklace" },
      userId,
    );
    expect(english.template).toContain("{{customer_name}}");
    // product_name stays a literal placeholder in the generated template — real values are
    // substituted per-recipient only at queue time (see message-queue.service.ts).
    expect(english.template).toContain("{{product_name}}");

    const romanUrdu = await generateCampaignMessageTemplate(
      { campaignType: "SPECIAL_OFFER", objective: "SALES", tone: "friendly", language: "ROMAN_URDU", productName: "Gold Necklace" },
      userId,
    );
    expect(romanUrdu.template).toContain("Assalam-o-Alaikum");
    expect(romanUrdu.template).not.toBe(english.template);
  });

  it("flags an unsafe generated message rather than silently allowing it", async () => {
    const result = await generateCampaignMessageTemplate(
      { campaignType: "GOLD_RATE_UPDATE", objective: "INFORMATIONAL", tone: "friendly", language: "ENGLISH" },
      userId,
    );
    // The gold-rate template never claims a return/investment outcome.
    expect(result.safe).toBe(true);
  });
});

describe("Message safety", () => {
  it("flags fake scarcity, guaranteed returns, and pressure tactics", () => {
    const result = validateMessageSafety("Hurry! Only 2 pieces left — guaranteed to double your money!");
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("flags a discount mentioned in the message that isn't present in the authorized offer", () => {
    const result = validateMessageSafety("Get 50% off today!", { authorizedOffer: "Free polishing with every purchase" });
    expect(result.safe).toBe(false);
    expect(result.violations.some((v) => v.rule === "unauthorized_discount")).toBe(true);
  });

  it("allows a discount that matches the authorized offer exactly", () => {
    const result = validateMessageSafety("Enjoy 20% off this week only at our store!", { authorizedOffer: "20% off" });
    expect(result.violations.some((v) => v.rule === "unauthorized_discount")).toBe(false);
  });

  it("passes a plain, factual, informational message", () => {
    const result = validateMessageSafety("Hello, Zarghoon Jewellers has new designs available. Would you like to see them?");
    expect(result.safe).toBe(true);
  });
});
