import { describe, expect, it } from "vitest";
import { buildLeadContext, SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { findUnsupportedClaims } from "@/lib/ai/factCheck";
import { aiFollowUpSchema } from "@/lib/ai/schema";
import { generateFollowUps } from "@/lib/ai/generate";
import { DemoProvider } from "@/lib/ai/providers/demo";
import { AIError, type AIProvider } from "@/lib/ai/providers/types";

const lead = {
  name: "Sarah Mitchell",
  property_interest: "2-bedroom apartment",
  budget: "$350,000",
  location: "Riverside",
  property_type: null,
  requirements: null,
  source: "Website",
  notes: null,
  status: "New",
};
const agent = { name: "Alex Agent", agency: null };

describe("prompt", () => {
  it("contains the core no-fabrication rules", () => {
    expect(SYSTEM_PROMPT).toMatch(/Never fabricate facts/);
    expect(SYSTEM_PROMPT).toMatch(/Do not claim that a property is available/);
  });

  it("sends only the first name and marks missing fields", () => {
    const ctx = buildLeadContext(lead, agent);
    expect(ctx).toContain("Lead first name: Sarah");
    expect(ctx).not.toContain("Mitchell");
    expect(ctx).toContain("Property type: (not provided)");
  });

  it("never includes phone or email", () => {
    const withContact = { ...lead, phone: "+1 555 010 9999", email: "s@example.com" } as typeof lead;
    const ctx = buildLeadContext(withContact, agent);
    expect(ctx).not.toContain("555");
    expect(ctx).not.toContain("example.com");
  });
});

describe("fact check", () => {
  const source = buildLeadContext(lead, agent);

  it("allows numbers that appear in the lead info", () => {
    expect(findUnsupportedClaims("Hi Sarah, a 2-bedroom around $350,000 in Riverside.", source)).toEqual([]);
  });

  it("flags invented prices and times", () => {
    const w = findUnsupportedClaims("It's listed at $420,000 and I can show it at 3pm.", source);
    expect(w.some((x) => x.includes("$420,000"))).toBe(true);
    expect(w.some((x) => x.includes("3pm"))).toBe(true);
  });
});

describe("AI output validation", () => {
  it("rejects output with missing fields", () => {
    expect(aiFollowUpSchema.safeParse({ immediate_response: "Hello there, thanks!" }).success).toBe(false);
  });

  it("throws a friendly AIError when the provider returns junk", async () => {
    const bad: AIProvider = { name: "bad", generateJSON: async () => ({ nope: true }) };
    await expect(generateFollowUps(bad, lead, agent)).rejects.toBeInstanceOf(AIError);
  });

  it("demo provider produces valid output that only uses supplied facts", async () => {
    const out = await generateFollowUps(new DemoProvider(), lead, agent);
    expect(out.result.immediate_response).toContain("Sarah");
    expect(out.result.missing_information).toContain("Property type");
    expect(out.warnings.immediate).toEqual([]);
  });
});

describe("fact check abbreviations", () => {
  it("accepts $350k when $350,000 was supplied", () => {
    const source = buildLeadContext(lead, agent);
    expect(findUnsupportedClaims("Around $350k works.", source)).toEqual([]);
  });
});
