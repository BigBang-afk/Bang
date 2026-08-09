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
    "createdAt" TIMESTAMP(3) NO