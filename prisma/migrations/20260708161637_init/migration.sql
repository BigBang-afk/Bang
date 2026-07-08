-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('CALL', 'PUT');

-- CreateEnum
CREATE TYPE "Expiry" AS ENUM ('SEC15', 'MIN1');

-- CreateEnum
CREATE TYPE "SignalResult" AS ENUM ('PENDING', 'WIN', 'LOSS');

-- CreateEnum
CREATE TYPE "SignalSource" AS ENUM ('LIVE', 'BACKTEST');

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pair" TEXT NOT NULL,
    "expiry" "Expiry" NOT NULL,
    "direction" "Direction" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "signalStrength" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "trendDirection" TEXT NOT NULL,
    "candlePressure" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "expiryTime" TIMESTAMP(3) NOT NULL,
    "result" "SignalResult" NOT NULL DEFAULT 'PENDING',
    "source" "SignalSource" NOT NULL DEFAULT 'LIVE',
    "backtestRunId" TEXT,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pair" TEXT NOT NULL,
    "expiry" "Expiry" NOT NULL,
    "totalTrades" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "avgConfidence" DOUBLE PRECISION NOT NULL,
    "bestPair" TEXT NOT NULL,
    "worstPair" TEXT NOT NULL,
    "winStreak" INTEGER NOT NULL,
    "lossStreak" INTEGER NOT NULL,

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_pair_expiry_idx" ON "Signal"("pair", "expiry");

-- CreateIndex
CREATE INDEX "Signal_createdAt_idx" ON "Signal"("createdAt");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "BacktestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
