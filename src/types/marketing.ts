export const CAMPAIGN_OBJECTIVES = ["AWARENESS", "ENGAGEMENT", "SALES", "RETENTION", "REACTIVATION", "INFORMATIONAL"] as const;
export type CampaignObjectiveValue = (typeof CAMPAIGN_OBJECTIVES)[number];

export const CAMPAIGN_TYPES = [
  "NEW_ARRIVAL",
  "VIP",
  "INACTIVE_CUSTOMER",
  "BIRTHDAY",
  "ANNIVERSARY",
  "FESTIVAL",
  "SPECIAL_OFFER",
  "NEW_COLLECTION",
  "GOLD_RATE_UPDATE",
  "FOLLOW_UP",
] as const;
export type CampaignTypeValue = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_STATUSES = ["DRAFT", "PENDING_APPROVAL", "SCHEDULED", "RUNNING", "PAUSED", "COMPLETED", "CANCELLED"] as const;
export type CampaignStatusValue = (typeof CAMPAIGN_STATUSES)[number];

export const MESSAGE_LANGUAGES = ["ENGLISH", "URDU", "ROMAN_URDU"] as const;
export type MessageLanguageValue = (typeof MESSAGE_LANGUAGES)[number];

export const MESSAGE_LANGUAGE_LABELS: Record<MessageLanguageValue, string> = {
  ENGLISH: "English",
  URDU: "Urdu",
  ROMAN_URDU: "Roman Urdu",
};

export const MESSAGE_TONES = ["friendly", "formal", "promotional", "informational"] as const;
export type MessageToneValue = (typeof MESSAGE_TONES)[number];

export const MARKETING_CHANNELS = ["WHATSAPP"] as const;
export type MarketingChannelValue = (typeof MARKETING_CHANNELS)[number];

export const MESSAGE_STATUSES = ["QUEUED", "PROCESSING", "SENT", "DELIVERED", "READ", "FAILED", "OPTED_OUT", "CANCELLED"] as const;
export type MessageStatusValue = (typeof MESSAGE_STATUSES)[number];

export const MARKETING_CONSENT_STATUSES = ["OPTED_IN", "OPTED_OUT", "UNKNOWN"] as const;
export type MarketingConsentStatusValue = (typeof MARKETING_CONSENT_STATUSES)[number];

export const FOLLOW_UP_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type FollowUpPriorityValue = (typeof FOLLOW_UP_PRIORITIES)[number];

export const FOLLOW_UP_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type FollowUpStatusValue = (typeof FOLLOW_UP_STATUSES)[number];

export const AUTOMATION_TRIGGERS = ["CUSTOMER_INACTIVE", "BIRTHDAY_UPCOMING", "ANNIVERSARY_UPCOMING"] as const;
export type AutomationTriggerValue = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_ACTIONS = ["CREATE_FOLLOW_UP_TASK", "CREATE_CAMPAIGN_DRAFT"] as const;
export type AutomationActionValue = (typeof AUTOMATION_ACTIONS)[number];

export const AUTOMATION_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "DISABLED"] as const;
export type AutomationStatusValue = (typeof AUTOMATION_STATUSES)[number];

export const CONTENT_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP"] as const;
export type ContentPlatformValue = (typeof CONTENT_PLATFORMS)[number];

export const CONTENT_TYPES = [
  "NEW_ARRIVAL",
  "PRODUCT_SPOTLIGHT",
  "EDUCATIONAL",
  "GOLD_KNOWLEDGE",
  "JEWELRY_CARE",
  "FESTIVAL",
  "BEHIND_THE_SCENES",
  "CUSTOMER_APPRECIATION",
] as const;
export type ContentTypeValue = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = ["DRAFT", "APPROVED", "PUBLISHED", "REJECTED"] as const;
export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];

/**
 * The Phase 7 AI segmentation vocabulary — see AI-MARKETING.md
 * "Segmentation". Lives here (not in ai-segmentation.service.ts) so
 * client components can import the label/list without pulling in a
 * `server-only` module.
 */
export const AI_SEGMENTS = [
  "NEW_CUSTOMER",
  "RECENT_BUYER",
  "REGULAR",
  "VIP",
  "HIGH_VALUE",
  "INACTIVE",
  "BRIDAL_INTEREST",
  "GOLD_BUYER",
  "DIAMOND_BUYER",
  "REPEAT_CUSTOMER",
  "CREDIT_CUSTOMER",
] as const;
export type AiSegmentValue = (typeof AI_SEGMENTS)[number];

export const AI_SEGMENT_LABELS: Record<AiSegmentValue, string> = {
  NEW_CUSTOMER: "New Customer",
  RECENT_BUYER: "Recent Buyer",
  REGULAR: "Regular",
  VIP: "VIP",
  HIGH_VALUE: "High Value",
  INACTIVE: "Inactive",
  BRIDAL_INTEREST: "Bridal Interest",
  GOLD_BUYER: "Gold Buyer",
  DIAMOND_BUYER: "Diamond Buyer",
  REPEAT_CUSTOMER: "Repeat Customer",
  CREDIT_CUSTOMER: "Credit Customer",
};
