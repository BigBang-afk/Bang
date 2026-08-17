import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";

/**
 * Marketing consent — see AI-MARKETING.md "Consent" / "Opt-out". UNKNOWN
 * (the schema default) is never treated as consent; only OPTED_IN
 * customers are eligible for a campaign message. See
 * campaign.service.ts's audience builder, which enforces this as a hard
 * filter, not a preference.
 */

export class CustomerNotFoundForConsentError extends Error {
  constructor(message = "Customer not found.") {
    super(message);
    this.name = "CustomerNotFoundForConsentError";
  }
}

export async function recordOptIn(customerId: string, source: string, userId: string): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) throw new CustomerNotFoundForConsentError();

  await prisma.customer.update({
    where: { id: customerId },
    data: { marketingConsent: "OPTED_IN", consentDate: new Date(), consentSource: source, optOutDate: null },
  });

  await writeAuditLog({
    userId,
    action: "CUSTOMER_OPTED_IN",
    entity: "Customer",
    entityId: customerId,
    metadata: { source },
  });
}

export async function recordOptOut(customerId: string, source: string, userId: string | null): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) throw new CustomerNotFoundForConsentError();

  await prisma.customer.update({
    where: { id: customerId },
    data: { marketingConsent: "OPTED_OUT", optOutDate: new Date() },
  });

  await writeAuditLog({
    userId,
    action: "CUSTOMER_OPTED_OUT",
    entity: "Customer",
    entityId: customerId,
    metadata: { source },
  });
}

/** STOP/UNSUBSCRIBE and the near-equivalents a real customer actually types — matched case-insensitively against the whole trimmed reply, never a substring match (so "please stop sending catalogues, thanks" is NOT auto-treated as an opt-out). */
export const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT", "CANCEL", "REMOVE ME"];

export function isOptOutKeyword(replyText: string): boolean {
  const normalized = replyText.trim().toUpperCase();
  return OPT_OUT_KEYWORDS.includes(normalized);
}

/** Called from the webhook handler on an inbound "reply" event. Returns true if the reply was recognized and handled as an opt-out. */
export async function handleInboundReplyForOptOut(customerId: string, replyText: string): Promise<boolean> {
  if (!isOptOutKeyword(replyText)) return false;
  await recordOptOut(customerId, "WhatsApp reply", null);
  return true;
}
