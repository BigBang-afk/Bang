export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Viewing Scheduled",
  "Negotiating",
  "Won",
  "Lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statuses that count as an ongoing conversation on the dashboard. */
export const ACTIVE_STATUSES: LeadStatus[] = [
  "Contacted",
  "Interested",
  "Viewing Scheduled",
  "Negotiating",
];

/** Leads in these statuses no longer need follow-ups. */
export const CLOSED_STATUSES: LeadStatus[] = ["Won", "Lost"];

export const PROPERTY_TYPES = [
  "Apartment",
  "House",
  "Villa",
  "Townhouse",
  "Condo",
  "Studio",
  "Land",
  "Commercial",
  "Other",
] as const;

export const LEAD_SOURCES = [
  "Website",
  "Property portal",
  "Referral",
  "Walk-in",
  "Phone call",
  "Social media",
  "Open house",
  "Other",
] as const;

export const MESSAGE_KINDS = ["immediate", "follow_up_1d", "follow_up_3d"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_KIND_LABELS: Record<MessageKind, string> = {
  immediate: "Immediate response",
  follow_up_1d: "Follow-up — 1 day",
  follow_up_3d: "Follow-up — 3 days",
};

export const FOLLOW_UP_KINDS = ["follow_up_1d", "follow_up_3d", "manual"] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];

export const FOLLOW_UP_KIND_LABELS: Record<FollowUpKind, string> = {
  follow_up_1d: "1-day follow-up",
  follow_up_3d: "3-day follow-up",
  manual: "Follow-up",
};
