import { z } from "zod";

/**
 * Zod validation for Phase 8 Server Actions — see the same
 * safeParse-then-service-call pattern as src/lib/validation/marketing.ts.
 * Every mutation the Business Intelligence module exposes is validated
 * here before it reaches a service function.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export const createBranchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required.").max(200),
  address: optionalText(500),
  city: optionalText(100),
  phone: optionalText(30),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  branchId: z.uuid(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const setUserBranchAccessSchema = z.object({
  targetUserId: z.uuid(),
  branchAccessMode: z.enum(["ALL_BRANCHES", "SPECIFIC_BRANCHES"]),
  branchIds: z.array(z.uuid()).default([]),
});

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export const alertActionSchema = z.object({
  alertId: z.uuid(),
});

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export const notificationPreferencesSchema = z.object({
  dailyReport: z.boolean(),
  criticalAlert: z.boolean(),
  cashShortage: z.boolean(),
  goldDiscrepancy: z.boolean(),
  majorExpense: z.boolean(),
  salesDrop: z.boolean(),
  inventoryAlert: z.boolean(),
});

// ---------------------------------------------------------------------------
// BI settings (thresholds)
// ---------------------------------------------------------------------------

export const biSettingsSchema = z.object({
  lowStockCategoryThreshold: z.coerce.number().int().min(0),
  agingStockDays: z.coerce.number().int().min(1),
  cashShortageThreshold: z.coerce.number().min(0),
  highBalanceThreshold: z.coerce.number().min(0),
  salesDropPercent: z.coerce.number().min(0).max(100),
  expenseSpikePercent: z.coerce.number().min(0),
  unusualTransactionAmount: z.coerce.number().min(0),
  forecastMinDaysInsufficient: z.coerce.number().int().min(1),
  forecastMinDaysStandard: z.coerce.number().int().min(1),
});
