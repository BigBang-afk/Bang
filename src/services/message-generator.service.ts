import "server-only";
import { callGenerateText } from "@/services/ai/ai-call";
import { validateMessageSafety, type SafetyViolation } from "@/services/message-safety.service";
import type { MessageLanguage } from "@/generated/prisma/client";

/**
 * The AI Message Generator — see AI-MARKETING.md "Message generator". The
 * output is always a TEMPLATE (placeholders like {{customer_name}} stay
 * literal) — per-recipient personalization happens later, at queue time,
 * from real data (see message-queue.service.ts). Every generated template
 * is run through `validateMessageSafety` before it's returned; the caller
 * decides what to do with a violation (campaign.service.ts refuses to
 * submit a campaign whose template fails).
 */

export type GenerateCampaignMessageInput = {
  /** Informational only — included in the generation context, not enforced here. */
  segmentLabel?: string;
  productName?: string;
  campaignType: string;
  objective: string;
  tone: "friendly" | "formal" | "promotional" | "informational";
  language: MessageLanguage;
  offer?: string;
  callToAction?: string;
  hasExpiryDate?: boolean;
};

export type GeneratedMessage = {
  template: string;
  safe: boolean;
  violations: SafetyViolation[];
};

export async function generateCampaignMessageTemplate(input: GenerateCampaignMessageInput, userId: string | null): Promise<GeneratedMessage> {
  const { text } = await callGenerateText(
    {
      task: "campaign_message",
      facts: {
        segmentLabel: input.segmentLabel ?? null,
        productName: input.productName ?? null,
        campaignType: input.campaignType,
        objective: input.objective,
        offer: input.offer ?? null,
        callToAction: input.callToAction ?? null,
        expiryDate: input.hasExpiryDate ? "true" : null,
      },
      style: { tone: input.tone, language: input.language },
    },
    userId,
  );

  const { safe, violations } = validateMessageSafety(text, { authorizedOffer: input.offer });
  return { template: text, safe, violations };
}
