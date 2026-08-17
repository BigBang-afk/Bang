import { z } from "zod";
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_TYPES,
  MESSAGE_LANGUAGES,
  MESSAGE_TONES,
  MARKETING_CHANNELS,
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_STATUSES,
  AUTOMATION_TRIGGERS,
  AUTOMATION_ACTIONS,
  AUTOMATION_STATUSES,
  CONTENT_PLATFORMS,
  CONTENT_TYPES,
} from "@/types/marketing";
import { GOLD_PURITIES } from "@/types/gold";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

export const recordOptInSchema = z.object({
  customerId: z.uuid(),
  source: z.string().trim().min(1, "A consent source is required.").max(200),
});

export const recordOptOutSchema = z.object({
  customerId: z.uuid(),
  source: z.string().trim().min(1).max(200).default("Manual"),
});

// ---------------------------------------------------------------------------
// Audience filters (shared shape — campaign create/update + preview)
// ---------------------------------------------------------------------------

export const audienceFiltersSchema = z.object({
  customerType: z.array(z.string()).optional(),
  vipOnly: z.boolean().optional(),
  lastPurchaseWithinDays: z.coerce.number().int().positive().optional(),
  lastPurchaseOlderThanDays: z.coerce.number().int().positive().optional(),
  minTotalSpending: z.coerce.number().nonnegative().optional(),
  minPurchaseCount: z.coerce.number().int().nonnegative().optional(),
  categoryIds: z.array(z.uuid()).optional(),
  purities: z.array(z.enum(GOLD_PURITIES)).optional(),
  city: z.string().trim().max(120).optional(),
  requireOptedIn: z.boolean().optional(),
  minEngagementScore: z.coerce.number().min(0).max(100).optional(),
  customerIds: z.array(z.uuid()).optional(),
});

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required.").max(200),
  description: optionalText(1000),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  campaignType: z.enum(CAMPAIGN_TYPES),
  audienceFilters: audienceFiltersSchema,
  channel: z.enum(MARKETING_CHANNELS).optional(),
  language: z.enum(MESSAGE_LANGUAGES).optional(),
  productId: z.uuid().optional(),
  offer: optionalText(500),
  expiryDate: z.coerce.date().optional(),
  messageTemplate: z.string().trim().min(1, "A message is required.").max(2000),
  scheduledAt: z.coerce.date().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  campaignId: z.uuid(),
});

export const campaignIdSchema = z.object({ campaignId: z.uuid() });

export const cancelCampaignSchema = z.object({ campaignId: z.uuid(), reason: optionalText(500) });
export const pauseCampaignSchema = z.object({ campaignId: z.uuid(), reason: optionalText(500) });
export const reopenReasonSchema = z.object({ campaignId: z.uuid(), reason: z.string().trim().min(1).max(500) });

export const audiencePreviewSchema = z.object({
  filters: audienceFiltersSchema,
  campaignId: z.uuid().optional(),
});

export const addManualExclusionSchema = z.object({
  campaignId: z.uuid(),
  customerId: z.uuid(),
  reason: optionalText(500),
});

export const removeManualExclusionSchema = z.object({
  campaignId: z.uuid(),
  customerId: z.uuid(),
});

// ---------------------------------------------------------------------------
// Message generator
// ---------------------------------------------------------------------------

export const generateMessageSchema = z.object({
  segmentLabel: optionalText(120),
  productName: optionalText(200),
  campaignType: z.enum(CAMPAIGN_TYPES),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  tone: z.enum(MESSAGE_TONES),
  language: z.enum(MESSAGE_LANGUAGES),
  offer: optionalText(500),
  callToAction: optionalText(200),
  hasExpiryDate: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Follow-up tasks
// ---------------------------------------------------------------------------

export const createFollowUpTaskSchema = z.object({
  customerId: z.uuid(),
  reason: z.string().trim().min(1, "A reason is required.").max(500),
  priority: z.enum(FOLLOW_UP_PRIORITIES).optional(),
  dueDate: z.coerce.date().optional(),
  assignedToId: z.uuid().optional(),
  notes: optionalText(1000),
});

export const createFollowUpTasksFromRecommendationsSchema = z.object({
  customerIds: z.array(z.uuid()).min(1, "Select at least one customer."),
});

export const updateFollowUpTaskStatusSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(FOLLOW_UP_STATUSES),
});

// ---------------------------------------------------------------------------
// Content generation
// ---------------------------------------------------------------------------

export const generateProductCaptionsSchema = z.object({ inventoryItemId: z.uuid() });

export const generateSocialContentSchema = z.object({
  platform: z.enum(CONTENT_PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  inventoryItemId: z.uuid().optional(),
  festivalName: optionalText(120),
});

export const createContentDraftSchema = z.object({
  inventoryItemId: z.uuid().optional(),
  platform: z.enum(CONTENT_PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  title: optionalText(200),
  body: z.string().trim().min(1, "Content body is required.").max(3000),
  hashtags: z.array(z.string().trim().max(60)).max(30).default([]),
  callToAction: optionalText(200),
});

export const contentDraftIdSchema = z.object({ draftId: z.uuid() });

// ---------------------------------------------------------------------------
// Automation rules
// ---------------------------------------------------------------------------

export const createAutomationRuleSchema = z.object({
  name: z.string().trim().min(1, "Rule name is required.").max(200),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  conditions: z.object({
    inactiveDays: z.coerce.number().int().positive().optional(),
    daysAhead: z.coerce.number().int().positive().optional(),
  }),
  action: z.enum(AUTOMATION_ACTIONS),
});

export const setAutomationRuleStatusSchema = z.object({
  ruleId: z.uuid(),
  status: z.enum(AUTOMATION_STATUSES),
});

export const runAutomationRuleSchema = z.object({ ruleId: z.uuid() });

// ---------------------------------------------------------------------------
// AI assistant
// ---------------------------------------------------------------------------

export const askAiAssistantSchema = z.object({
  question: z.string().trim().min(1, "Ask a question.").max(500),
  customerId: z.uuid().optional(),
});

// ---------------------------------------------------------------------------
// Marketing settings
// ---------------------------------------------------------------------------

export const updateMarketingSettingsSchema = z.object({
  maxMessagesPerCustomerPerDay: z.coerce.number().int().min(0).max(20),
  maxMessagesPerCustomerPerWeek: z.coerce.number().int().min(0).max(50),
  minCampaignGapHours: z.coerce.number().int().min(0).max(24 * 30),
  rateLimitPerMinute: z.coerce.number().int().min(1).max(1000),
  rateLimitPerHour: z.coerce.number().int().min(1).max(10000),
  maxRetries: z.coerce.number().int().min(0).max(10),
  attributionWindowDays: z.coerce.number().int().min(1).max(90),
  rfmPeriodDays: z.coerce.number().int().min(1).max(3650),
  engagementScoreWeights: z.object({
    recency: z.coerce.number().min(0).max(100),
    frequency: z.coerce.number().min(0).max(100),
    monetary: z.coerce.number().min(0).max(100),
    engagement: z.coerce.number().min(0).max(100),
  }),
});
