import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createCustomer } from "@/services/customer.service";
import { recordOptIn, recordOptOut, isOptOutKeyword, handleInboundReplyForOptOut } from "@/services/marketing-consent.service";
import { resolveAudience } from "@/services/audience-builder.service";
import { getSeededOwnerId, uniqueSuffix } from "./helpers/db-fixtures";

let userId: string;

beforeAll(async () => {
  userId = await getSeededOwnerId();
});

/** A plausible-looking phone number (digits only after the leading +, <=15 total) — see audience-builder.service.ts's isPlausiblePhoneNumber, which several Phase 7 tests below deliberately exercise. */
function uniquePhone(): string {
  const digits = (Date.now() % 1e8).toString().padStart(8, "0");
  return `+923${digits}${Math.floor(Math.random() * 10)}`;
}

describe("Marketing consent (Test 5)", () => {
  it("recording an opt-in sets marketingConsent, consentDate, and consentSource", async () => {
    const customer = await createCustomer({ firstName: `Consent ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.marketingConsent).toBe("OPTED_IN");
    expect(row.consentSource).toBe("In-store form");
    expect(row.consentDate).not.toBeNull();

    const log = await prisma.auditLog.findFirst({ where: { entity: "Customer", entityId: customer.id, action: "CUSTOMER_OPTED_IN" } });
    expect(log).not.toBeNull();
  });

  it("a new customer's consent defaults to UNKNOWN — never treated as consent", async () => {
    const customer = await createCustomer({ firstName: `Default ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.marketingConsent).toBe("UNKNOWN");
  });
});

describe("Opt-out (Test 6)", () => {
  it("recording an opt-out sets marketingConsent = OPTED_OUT and optOutDate, and audits it", async () => {
    const customer = await createCustomer({ firstName: `OptOut ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);
    await recordOptOut(customer.id, "Manual", userId);

    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.marketingConsent).toBe("OPTED_OUT");
    expect(row.optOutDate).not.toBeNull();

    const log = await prisma.auditLog.findFirst({ where: { entity: "Customer", entityId: customer.id, action: "CUSTOMER_OPTED_OUT" } });
    expect(log).not.toBeNull();
  });

  it("recognizes STOP/UNSUBSCRIBE and equivalents, but never a substring match", () => {
    expect(isOptOutKeyword("STOP")).toBe(true);
    expect(isOptOutKeyword("stop")).toBe(true);
    expect(isOptOutKeyword("unsubscribe")).toBe(true);
    expect(isOptOutKeyword("  Stop  ")).toBe(true);
    expect(isOptOutKeyword("please stop sending catalogues, thanks")).toBe(false);
    expect(isOptOutKeyword("yes please")).toBe(false);
  });

  it("an inbound STOP reply immediately prevents future marketing eligibility", async () => {
    const customer = await createCustomer({ firstName: `ReplyStop ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const handled = await handleInboundReplyForOptOut(customer.id, "STOP");
    expect(handled).toBe(true);

    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.marketingConsent).toBe("OPTED_OUT");
  });
});

describe("CRITICAL TEST — marketingConsent = OPTED_OUT is excluded from a campaign audience", () => {
  it("excludes an OPTED_OUT customer from resolveAudience's eligible set", async () => {
    const customer = await createCustomer({ firstName: `CriticalOptOut ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptOut(customer.id, "Manual", userId);

    const audience = await resolveAudience({ requireOptedIn: true });
    expect(audience.eligibleCustomerIds).not.toContain(customer.id);
  });
});

describe("CRITICAL TEST — marketingConsent = OPTED_IN is eligible for a campaign audience", () => {
  it("includes an OPTED_IN customer with a valid number in resolveAudience's eligible set", async () => {
    const customer = await createCustomer({ firstName: `CriticalOptIn ${uniqueSuffix()}`, phone: uniquePhone() }, userId);
    await recordOptIn(customer.id, "In-store form", userId);

    const audience = await resolveAudience({ requireOptedIn: true });
    expect(audience.eligibleCustomerIds).toContain(customer.id);
  });
});
