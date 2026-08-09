-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "traderName" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usdToPkrRate" DECIMAL(65,30) NOT NULL DEFAULT 280,
    "goldPricePerGramPkr" DECIMAL(65,30) NOT NULL DEFAULT 29000,
    "ratesUpdatedAt" TIMESTAMP(3),
    "defaultRiskPct" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
    "defaultDailyTargetPct" DECIMAL(65,30) NOT NULL DEFAULT 3,
    "defaultDailyLossPct" DECIMAL(65,30) NOT NULL DEFAULT 2,
    "defaultMaxTrades" INTEGER NOT NULL DEFAULT 10,
    "defaultMaxConsecutiveLosses" INTEGER NOT NULL DEFAULT 3,
    "countBreakevenAsWin" BOOLEAN NOT NULL DEFAULT false,
    "drawdownLowPct" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "drawdownModeratePct" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "drawdownHighPct" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "drawdownCriticalPct" DECIMAL(65,30) NOT NULL DEFAULT 30,
    "theme" TEXT NOT NULL DEFAULT 'DARK',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Trading Account',
    "mainTradingType" TEXT NOT NULL,
    "startingBalanceUsd" DECIMAL(65,30) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "session" TEXT,
    "customSession" TEXT,
    "broker" TEXT,
    "marketType" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entryPrice" DECIMAL(65,30),
    "exitPrice" DECIMAL(65,30),
    "positionSize" DECIMAL(65,30),
    "riskUsd" DECIMAL(65,30),
    "stopLoss" DECIMAL(65,30),
    "takeProfit" DECIMAL(65,30),
    "plannedRR" DECIMAL(65,30),
    "grossPnlUsd" DECIMAL(65,30) NOT NULL,
    "feesUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netPnlUsd" DECIMAL(65,30) NOT NULL,
    "pnlPkr" DECIMAL(65,30) NOT NULL,
    "goldEquivalentG" DECIMAL(65,30) NOT NULL,
    "usdPkrRateAtEntry" DECIMAL(65,30) NOT NULL,
    "goldPricePkrAtEntry" DECIMAL(65,30) NOT NULL,
    "strategyId" TEXT,
    "setup" TEXT,
    "timeframe" TEXT,
    "durationMinutes" INTEGER,
    "screenshotUrl" TEXT,
    "notes" TEXT,
    "emotion" TEXT,
    "qualityRating" INTEGER,
    "result" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_plans" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startingBalance" DECIMAL(65,30) NOT NULL,
    "dailyTargetPct" DECIMAL(65,30) NOT NULL,
    "dailyTargetUsd" DECIMAL(65,30) NOT NULL,
    "dailyMaxLossPct" DECIMAL(65,30) NOT NULL,
    "dailyMaxLossUsd" DECIMAL(65,30) NOT NULL,
    "riskPerTradePct" DECIMAL(65,30) NOT NULL,
    "riskPerTradeUsd" DECIMAL(65,30) NOT NULL,
    "maxTrades" INTEGER NOT NULL,
    "maxConsecutiveLosses" INTEGER NOT NULL,
    "session1Target" DECIMAL(65,30),
    "session2Target" DECIMAL(65,30),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_journals" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "todaysGoal" TEXT,
    "marketOutlook" TEXT,
    "tradingPlan" TEXT,
    "whatWentWell" TEXT,
    "whatWentWrong" TEXT,
    "mistakes" TEXT,
    "lessonsLearned" TEXT,
    "emotionalState" TEXT,
    "confidence" INTEGER,
    "disciplineScore" INTEGER,
    "emotionalControlScore" INTEGER,
    "executionScore" INTEGER,
    "riskManagementScore" INTEGER,
    "overallScore" INTEGER,
    "screenshotUrl" TEXT,
    "tomorrowsImprovement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "pkrEquivalent" DECIMAL(65,30) NOT NULL,
    "usdPkrRateAtEntry" DECIMAL(65,30) NOT NULL,
    "purpose" TEXT,
    "destination" TEXT NOT NULL,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transactions" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "relatedTradeId" TEXT,
    "relatedWithdrawalId" TEXT,
    "relatedDepositId" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_allocation_rules" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "tradingCapitalPct" DECIMAL(65,30) NOT NULL DEFAULT 30,
    "goldPct" DECIMAL(65,30) NOT NULL DEFAULT 30,
    "savingsPct" DECIMAL(65,30) NOT NULL DEFAULT 15,
    "businessPct" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "realEstatePct" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "personalPct" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "otherPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_allocation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation_transfers" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "pkrEquivalent" DECIMAL(65,30) NOT NULL,
    "usdPkrRateAtEntry" DECIMAL(65,30) NOT NULL,
    "goldGrams" DECIMAL(65,30),
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocation_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_transactions" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "txType" TEXT NOT NULL DEFAULT 'BUY',
    "goldType" TEXT,
    "purity" TEXT NOT NULL,
    "purityCustomLabel" TEXT,
    "weightGrams" DECIMAL(65,30) NOT NULL,
    "pricePerGramPkr" DECIMAL(65,30) NOT NULL,
    "totalCostPkr" DECIMAL(65,30) NOT NULL,
    "usdEquivalent" DECIMAL(65,30) NOT NULL,
    "usdPkrRateAtEntry" DECIMAL(65,30) NOT NULL,
    "dealer" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gold_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valuePkr" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amountPkr" DECIMAL(65,30) NOT NULL,
    "usdEquivalent" DECIMAL(65,30) NOT NULL,
    "usdPkrRateAtEntry" DECIMAL(65,30) NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DECIMAL(65,30) NOT NULL,
    "startValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'USD',
    "targetDate" TIMESTAMP(3),
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_targets" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startingCapital" DECIMAL(65,30) NOT NULL,
    "targetProfit" DECIMAL(65,30) NOT NULL,
    "maxDrawdownPct" DECIMAL(65,30) NOT NULL,
    "withdrawalGoal" DECIMAL(65,30),
    "goldPurchaseGoalGrams" DECIMAL(65,30),
    "savingsGoal" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_rate_history" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "currency_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_rate_history" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "pricePerGramPkr" DECIMAL(65,30) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "gold_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_userId_key" ON "settings"("userId");

-- CreateIndex
CREATE INDEX "trades_tradingAccountId_date_idx" ON "trades"("tradingAccountId", "date");

-- CreateIndex
CREATE INDEX "trades_tradingAccountId_symbol_idx" ON "trades"("tradingAccountId", "symbol");

-- CreateIndex
CREATE INDEX "trades_tradingAccountId_strategyId_idx" ON "trades"("tradingAccountId", "strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_plans_tradingAccountId_date_key" ON "daily_plans"("tradingAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_journals_tradingAccountId_date_key" ON "daily_journals"("tradingAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_tradingAccountId_name_key" ON "strategies"("tradingAccountId", "name");

-- CreateIndex
CREATE INDEX "withdrawals_tradingAccountId_date_idx" ON "withdrawals"("tradingAccountId", "date");

-- CreateIndex
CREATE INDEX "deposits_tradingAccountId_date_idx" ON "deposits"("tradingAccountId", "date");

-- CreateIndex
CREATE INDEX "account_transactions_tradingAccountId_date_idx" ON "account_transactions"("tradingAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "profit_allocation_rules_tradingAccountId_key" ON "profit_allocation_rules"("tradingAccountId");

-- CreateIndex
CREATE INDEX "allocation_transfers_tradingAccountId_date_idx" ON "allocation_transfers"("tradingAccountId", "date");

-- CreateIndex
CREATE INDEX "gold_transactions_tradingAccountId_date_idx" ON "gold_transactions"("tradingAccountId", "date");

-- CreateIndex
CREATE INDEX "expenses_tradingAccountId_date_idx" ON "expenses"("tradingAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_targets_tradingAccountId_month_year_key" ON "monthly_targets"("tradingAccountId", "month", "year");

-- CreateIndex
CREATE INDEX "currency_rate_history_tradingAccountId_effectiveAt_idx" ON "currency_rate_history"("tradingAccountId", "effectiveAt");

-- CreateIndex
CREATE INDEX "gold_rate_history_tradingAccountId_effectiveAt_idx" ON "gold_rate_history"("tradingAccountId", "effectiveAt");

-- CreateIndex
CREATE INDEX "attachments_tradingAccountId_relatedType_relatedId_idx" ON "attachments"("tradingAccountId", "relatedType", "relatedId");

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_journals" ADD CONSTRAINT "daily_journals_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_relatedTradeId_fkey" FOREIGN KEY ("relatedTradeId") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_relatedWithdrawalId_fkey" FOREIGN KEY ("relatedWithdrawalId") REFERENCES "withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_relatedDepositId_fkey" FOREIGN KEY ("relatedDepositId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_allocation_rules" ADD CONSTRAINT "profit_allocation_rules_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_transfers" ADD CONSTRAINT "allocation_transfers_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_transactions" ADD CONSTRAINT "gold_transactions_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_targets" ADD CONSTRAINT "monthly_targets_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_rate_history" ADD CONSTRAINT "currency_rate_history_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_rate_history" ADD CONSTRAINT "gold_rate_history_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

