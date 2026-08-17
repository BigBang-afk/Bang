export const KARIGAR_SPECIALIZATIONS = [
  "GOLDSMITH",
  "POLISHER",
  "STONE_SETTER",
  "DESIGNER",
  "REPAIR",
  "OTHER",
] as const;
export type KarigarSpecializationValue = (typeof KARIGAR_SPECIALIZATIONS)[number];

export const KARIGAR_SPECIALIZATION_LABELS: Record<KarigarSpecializationValue, string> = {
  GOLDSMITH: "Goldsmith",
  POLISHER: "Polisher",
  STONE_SETTER: "Stone Setter",
  DESIGNER: "Designer",
  REPAIR: "Repair",
  OTHER: "Other",
};

export const KARIGAR_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
export type KarigarStatusValue = (typeof KARIGAR_STATUSES)[number];

export const KARIGAR_STATUS_LABELS: Record<KarigarStatusValue, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

export const KARIGAR_LIST_SORTS = ["NEWEST", "OLDEST", "NAME"] as const;
export type KarigarListSortValue = (typeof KARIGAR_LIST_SORTS)[number];
