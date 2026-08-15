-- CreateEnum
CREATE TYPE "SignalDirection" AS ENUM ('LONG', 'SHORT');

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "direction" "SignalDirection" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "agreeingCount" INTEGER NOT NULL,
    "totalStrategies" INTEGER NOT NULL,
    "entry" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit1" DOUBLE PRECISION,
    "takeProfit2" DOUBLE PRECISION,
    "takeProfit3" DOUBLE PRECISION,
    "atr" DOUBLE PRECISION,
    "backtestWinRate" INTEGER,
    "backtestSampleSize" INTEGER,
    "strategyBreakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedById" TEXT,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_symbol_createdAt_idx" ON "Signal"("symbol", "createdAt");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

