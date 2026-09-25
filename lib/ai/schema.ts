import { z } from "zod";
import { cleanText } from "../validation";

const message = (max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(10, "AI message was empty or too short").max(max, "AI message was too long"));

/** What we accept back from any AI provider. Anything else is rejected before display. */
export const aiFollowUpSchema = z.object({
  immediate_response: message(1200),
  follow_up_1_day: message(1000),
  follow_up_3_days: message(1000),
  lead_summary: message(1500),
  suggested_next_action: message(800),
  missing_information: z
    .array(z.string().transform(cleanText).pipe(z.string().min(1).max(200)))
    .max(15)
    .default([]),
});

export type AIFollowUpResult = z.infer<typeof aiFollowUpSchema>;

/** JSON schema sent to the model so it returns exactly this structure. */
export const aiFollowUpJsonSchema = {
  type: "object",
  properties: {
    immediate_response: {
      type: "string",
      description: "First reply to send now. 2-5 sentences.",
    },
    follow_up_1_day: {
      type: "string",
      description: "Gentle follow-up to send 1 day later if there is no reply. 1-3 sentences.",
    },
    follow_up_3_days: {
      type: "string",
      description: "Final light-touch follow-up for 3 days later. 1-3 sentences.",
    },
    lead_summary: {
      type: "string",
      description: "2-4 sentence summary of the lead for the agent, using only provided facts.",
    },
    suggested_next_action: {
      type: "string",
      description: "One concrete next step for the agent.",
    },
    missing_information: {
      type: "array",
      items: { type: "string" },
      description: "Useful facts that were not provided (e.g. budget, move-in date).",
    },
  },
  required: [
    "immediate_response",
    "follow_up_1_day",
    "follow_up_3_days",
    "lead_summary",
    "suggested_next_action",
    "missing_information",
  ],
  additionalProperties: false,
} as const;
