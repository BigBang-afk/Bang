import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const registerSchema = z.object({
  email: emailSchema,
  traderName: z.string().trim().min(1, "Trader name is required").max(80),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
});

export const setupSchema = z.object({
  traderName: z.string().trim().min(1).max(80),
  startingBalanceUsd: z.coerce.number().nonnegative("Starting balance cannot be negative"),
  mainTradingType: z.enum(["FOREX", "CRYPTO", "BINARY", "STOCKS", "MIXED"]),
  usdToPkrRate: z.coerce.number().positive("Rate must be greater than zero"),
  goldPricePerGramPkr: z.coerce.number().positive("Gold price must be greater than zero"),
  ratesUpdatedAt: z.string().optional(),
});

export const tradeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  session: z.enum(["ASIA", "LONDON", "NEW_YORK", "CUSTOM"]).optional(),
  customSession: z.string().optional(),
  broker: z.string().optional(),
  marketType: z.enum(["FOREX", "CRYPTO", "BINARY", "STOCKS", "OTHER"]),
  symbol: z.string().trim().min(1, "Symbol is required"),
  direction: z.enum(["LONG", "SHORT", "CALL", "PUT"]),
  entryPrice: z.coerce.number().optional().nullable(),
  exitPrice: z.coerce.number().optional().nullable(),
  positionSize: z.coerce.number().optional().nullable(),
  riskUsd: z.coerce.number().min(0, "Risk cannot be negative").optional().nullable(),
  stopLoss: z.coerce.number().optional().nullable(),
  takeProfit: z.coerce.number().optional().nullable(),
  plannedRR: z.coerce.number().optional().nullable(),
  grossPnlUsd: z.coerce.number(),
  feesUsd: z.coerce.number().min(0, "Fees cannot be negative").default(0),
  netPnlOverride: z.coerce.number().optional().nullable(),
  strategyId: z.string().optional().nullable(),
  setup: z.string().optional(),
  timeframe: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
  screenshotUrl: z.string().optional().nullable(),
  notes: z.string().optional(),
  emotion: z.string().optional(),
  qualityRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  result: z.enum(["WIN", "LOSS", "BREAKEVEN"]),
  id: z.string().optional(),
});

export const dailyPlanSchema = z.object({
  date: z.string().min(1),
  startingBalance: z.coerce.number().nonnegative(),
  dailyTargetPct: z.coerce.number().min(0).max(1000),
  dailyMaxLossPct: z.coerce.number().min(0).max(100),
  riskPerTradePct: z.coerce.number().min(0).max(100),
  maxTrades: z.coerce.number().int().min(1),
  maxConsecutiveLosses: z.coerce.number().int().min(1),
  session1Target: z.coerce.number().optional().nullable(),
  session2Target: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

export const dailyJournalSchema = z.object({
  date: z.string().min(1),
  todaysGoal: z.string().optional(),
  marketOutlook: z.string().optional(),
  tradingPlan: z.string().optional(),
  whatWentWell: z.string().optional(),
  whatWentWrong: z.string().optional(),
  mistakes: z.string().optional(),
  lessonsLearned: z.string().optional(),
  emotionalState: z.string().optional(),
  confidence: z.coerce.number().int().min(1).max(10).optional().nullable(),
  disciplineScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  emotionalControlScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  executionScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  riskManagementScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  overallScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  screenshotUrl: z.string().optional().nullable(),
  tomorrowsImprovement: z.string().optional(),
});

export const strategySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Strategy name is required"),
  description: z.string().optional(),
});

export const withdrawalSchema = z.object({
  date: z.string().min(1),
  amountUsd: z.coerce.number().positive("Withdrawal amount must be greater than zero"),
  purpose: z.string().optional(),
  destination: z.enum([
    "CASH",
    "BANK",
    "GOLD",
    "CRYPTO",
    "BUSINESS",
    "SAVINGS",
    "REAL_ESTATE",
    "PERSONAL_EXPENSE",
    "OTHER",
  ]),
  notes: z.string().optional(),
});

export const depositSchema = z.object({
  date: z.string().min(1),
  amountUsd: z.coerce.number().positive("Deposit amount must be greater than zero"),
  notes: z.string().optional(),
});

export const profitEntrySchema = z.object({
  date: z.string().min(1),
  amountUsd: z.coerce.number(),
  source: z.enum(["TRADING", "OTHER"]),
  notes: z.string().optional(),
});

export const allocationRuleSchema = z
  .object({
    tradingCapitalPct: z.coerce.number().min(0).max(100),
    goldPct: z.coerce.number().min(0).max(100),
    savingsPct: z.coerce.number().min(0).max(100),
    businessPct: z.coerce.number().min(0).max(100),
    realEstatePct: z.coerce.number().min(0).max(100),
    personalPct: z.coerce.number().min(0).max(100),
    otherPct: z.coerce.number().min(0).max(100),
    otherLabel: z.string().optional(),
  })
  .refine(
    (v) =>
      Math.abs(
        v.tradingCapitalPct +
          v.goldPct +
          v.savingsPct +
          v.businessPct +
          v.realEstatePct +
          v.personalPct +
          v.otherPct -
          100
      ) < 0.01,
    { message: "Allocation percentages must add up to exactly 100%" }
  );

export const allocationTransferSchema = z.object({
  date: z.string().min(1),
  category: z.enum([
    "TRADING_CAPITAL",
    "GOLD",
    "SAVINGS",
    "BUSINESS",
    "REAL_ESTATE",
    "PERSONAL",
    "OTHER",
  ]),
  amountUsd: z.coerce.number().positive(),
  goldGrams: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

export const goldTransactionSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  txType: z.enum(["BUY", "SELL"]).default("BUY"),
  goldType: z.string().optional(),
  purity: z.enum(["24K", "22K", "21K", "18K", "CUSTOM"]),
  purityCustomLabel: z.string().optional(),
  weightGrams: z.coerce.number().positive("Weight must be greater than zero"),
  pricePerGramPkr: z.coerce.number().positive("Price must be greater than zero"),
  dealer: z.string().optional(),
  notes: z.string().optional(),
});

export const assetSchema = z.object({
  id: z.string().optional(),
  category: z.enum(["CASH", "BANK", "CRYPTO", "BUSINESS", "REAL_ESTATE", "OTHER"]),
  name: z.string().trim().min(1, "Asset name is required"),
  valueUsd: z.coerce.number().min(0).default(0),
  valuePkr: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  category: z.enum([
    "FOOD",
    "SHOPPING",
    "BILLS",
    "TRAVEL",
    "BUSINESS",
    "FAMILY",
    "ENTERTAINMENT",
    "TRADING_EXPENSE",
    "OTHER",
  ]),
  description: z.string().optional(),
  amountPkr: z.coerce.number().positive("Amount must be greater than zero"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export const goalSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["BALANCE", "MONTHLY_PROFIT", "GOLD_GRAMS", "SAVINGS", "NET_WORTH", "CUSTOM"]),
  title: z.string().trim().min(1, "Title is required"),
  targetValue: z.coerce.number().positive("Target must be greater than zero"),
  startValue: z.coerce.number().min(0).default(0),
  unit: z.enum(["USD", "PKR", "GRAMS"]).default("USD"),
  targetDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const monthlyTargetSchema = z.object({
  id: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  startingCapital: z.coerce.number().nonnegative(),
  targetProfit: z.coerce.number(),
  maxDrawdownPct: z.coerce.number().min(0).max(100),
  withdrawalGoal: z.coerce.number().optional().nullable(),
  goldPurchaseGoalGrams: z.coerce.number().optional().nullable(),
  savingsGoal: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

export const settingsSchema = z.object({
  usdToPkrRate: z.coerce.number().positive(),
  goldPricePerGramPkr: z.coerce.number().positive(),
  defaultRiskPct: z.coerce.number().min(0).max(100),
  defaultDailyTargetPct: z.coerce.number().min(0).max(1000),
  defaultDailyLossPct: z.coerce.number().min(0).max(100),
  defaultMaxTrades: z.coerce.number().int().min(1),
  defaultMaxConsecutiveLosses: z.coerce.number().int().min(1),
  countBreakevenAsWin: z.coerce.boolean().default(false),
  drawdownLowPct: z.coerce.number().min(0).max(100),
  drawdownModeratePct: z.coerce.number().min(0).max(100),
  drawdownHighPct: z.coerce.number().min(0).max(100),
  drawdownCriticalPct: z.coerce.number().min(0).max(100),
  theme: z.enum(["DARK", "LIGHT", "SYSTEM"]),
  timezone: z.string().min(1),
});
