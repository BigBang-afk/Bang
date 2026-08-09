-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "traderName" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "usdToPkrRate" DECIMAL NOT NULL DEFAULT 280,
    "goldPricePerGramPkr" DECIMAL NOT NULL DEFAULT 29000,
    "ratesUpdatedAt" DATETIME,
    "defaultRiskPct" DECIMAL NOT NULL DEFAULT 0.5,
    "defaultDailyTargetPct" DECIMAL NOT NULL DEFAULT 3,
    "defaultDailyLossPct" DECIMAL NOT NULL DEFAULT 2,
    "defaultMaxTrades" INTEGER NOT NULL DEFAULT 10,
    "defaultMaxConsecutiveLosses" INTEGER NOT NULL DEFAULT 3,
    "countBreakevenAsWin" BOOLEAN NOT NULL DEFAULT false,
    "drawdownLowPct" DECIMAL NOT NULL DEFAULT 5,
    "drawdownModeratePct" DECIMAL NOT NULL DEFAULT 10,
    "drawdownHighPct" DECIMAL NOT NULL DEFAULT 20,
    "drawdownCriticalPct" DECIMAL NOT NULL DEFAULT 30,
    "theme" TEXT NOT NULL DEFAULT 'DARK',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trading_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Trading Account',
    "mainTradingType" TEXT NOT NULL,
    "startingBalanceUsd" DECIMAL NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trading_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "time" TEXT,
    "session" TEXT,
    "customSession" TEXT,
    "broker" TEXT,
    "marketType" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entryPrice" DECIMAL,
    "exitPrice" DECIMAL,
    "positionSize" DECIMAL,
    "riskUsd" DECIMAL,
    "stopLoss" DECIMAL,
    "takeProfit" DECIMAL,
    "plannedRR" DECIMAL,
    "grossPnlUsd" DECIMAL NOT NULL,
    "feesUsd" DECIMAL NOT NULL DEFAULT 0,
    "netPnlUsd" DECIMAL NOT NULL,
    "pnlPkr" DECIMAL NOT NULL,
    "goldEquivalentG" DECIMAL NOT NULL,
    "usdPkrRateAtEntry" DECIMAL NOT NULL,
    "goldPricePkrAtEntry" DECIMAL NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "trades_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trades_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startingBalance" DECIMAL NOT NULL,
    "dailyTargetPct" DECIMAL NOT NULL,
    "dailyTargetUsd" DECIMAL NOT NULL,
    "dailyMaxLossPct" DECIMAL NOT NULL,
    "dailyMaxLossUsd" DECIMAL NOT NULL,
    "riskPerTradePct" DECIMAL NOT NULL,
    "riskPerTradeUsd" DECIMAL NOT NULL,
    "maxTrades" INTEGER NOT NULL,
    "maxConsecutiveLosses" INTEGER NOT NULL,
    "session1Target" DECIMAL,
    "session2Target" DECIMAL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "daily_plans_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_journals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "daily_journals_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "strategies_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amountUsd" DECIMAL NOT NULL,
    "pkrEquivalent" DECIMAL NOT NULL,
    "usdPkrRateAtEntry" DECIMAL NOT NULL,
    "purpose" TEXT,
    "destination" TEXT NOT NULL,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "withdrawals_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amountUsd" DECIMAL NOT NULL,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deposits_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "amountUsd" DECIMAL NOT NULL,
    "relatedTradeId" TEXT,
    "relatedWithdrawalId" TEXT,
    "relatedDepositId" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_transactions_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "account_transactions_relatedTradeId_fkey" FOREIGN KEY ("relatedTradeId") REFERENCES "trades" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "account_transactions_relatedWithdrawalId_fkey" FOREIGN KEY ("relatedWithdrawalId") REFERENCES "withdrawals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "account_transactions_relatedDepositId_fkey" FOREIGN KEY ("relatedDepositId") REFERENCES "deposits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "profit_allocation_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "tradingCapitalPct" DECIMAL NOT NULL DEFAULT 30,
    "goldPct" DECIMAL NOT NULL DEFAULT 30,
    "savingsPct" DECIMAL NOT NULL DEFAULT 15,
    "businessPct" DECIMAL NOT NULL DEFAULT 10,
    "realEstatePct" DECIMAL NOT NULL DEFAULT 10,
    "personalPct" DECIMAL NOT NULL DEFAULT 5,
    "otherPct" DECIMAL NOT NULL DEFAULT 0,
    "otherLabel" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "profit_allocation_rules_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "allocation_transfers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "amountUsd" DECIMAL NOT NULL,
    "pkrEquivalent" DECIMAL NOT NULL,
    "usdPkrRateAtEntry" DECIMAL NOT NULL,
    "goldGrams" DECIMAL,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "allocation_transfers_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gold_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "txType" TEXT NOT NULL DEFAULT 'BUY',
    "goldType" TEXT,
    "purity" TEXT NOT NULL,
    "purityCustomLabel" TEXT,
    "weightGrams" DECIMAL NOT NULL,
    "pricePerGramPkr" DECIMAL NOT NULL,
    "totalCostPkr" DECIMAL NOT NULL,
    "usdEquivalent" DECIMAL NOT NULL,
    "usdPkrRateAtEntry" DECIMAL NOT NULL,
    "dealer" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "gold_transactions_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueUsd" DECIMAL NOT NULL DEFAULT 0,
    "valuePkr" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assets_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amountPkr" DECIMAL NOT NULL,
    "usdEquivalent" DECIMAL NOT NULL,
    "usdPkrRateAtEntry" DECIMAL NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expenses_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DECIMAL NOT NULL,
    "startValue" DECIMAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'USD',
    "targetDate" DATETIME,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "goals_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monthly_targets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startingCapital" DECIMAL NOT NULL,
    "targetProfit" DECIMAL NOT NULL,
    "maxDrawdownPct" DECIMAL NOT NULL,
    "withdrawalGoal" DECIMAL,
    "goldPurchaseGoalGrams" DECIMAL,
    "savingsGoal" DECIMAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "monthly_targets_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "currency_rate_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "currency_rate_history_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gold_rate_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "pricePerGramPkr" DECIMAL NOT NULL,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "gold_rate_history_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradingAccountId" TEXT NOT NULL,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "trading_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
