import { Router } from "express";
import { z } from "zod";
import { TradeDirection } from "@prisma/client";
import { prisma } from "../db/client";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../util/asyncHandler";
import { ALLOWED_EXPIRY_SECONDS, openTrade } from "./tradeEngine";

const router = Router();

const openTradeSchema = z.object({
  symbol: z.string(),
  direction: z.nativeEnum(TradeDirection),
  stakeCents: z.number().int().positive(),
  expirySeconds: z.number().int(),
});

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = openTradeSchema.parse(req.body);
    const trade = await openTrade({
      userId: req.auth!.userId,
      symbol: body.symbol,
      direction: body.direction,
      stakeCents: BigInt(body.stakeCents),
      expirySeconds: body.expirySeconds,
    });
    res.status(201).json(serializeTrade(trade));
  })
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const trades = await prisma.trade.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { entryAt: "desc" },
      take: 100,
    });
    res.json(trades.map(serializeTrade));
  })
);

router.get("/expiry-options", requireAuth, (_req, res) => {
  res.json(ALLOWED_EXPIRY_SECONDS);
});

function serializeTrade(trade: {
  id: number;
  symbol: string;
  assetClass: string;
  direction: string;
  stakeCents: bigint;
  payoutRatio: number;
  entryPrice: number;
  entryAt: Date;
  expiryAt: Date;
  exitPrice: number | null;
  status: string;
  payoutCents: bigint | null;
  settledAt: Date | null;
}) {
  return {
    ...trade,
    stakeCents: trade.stakeCents.toString(),
    payoutCents: trade.payoutCents?.toString() ?? null,
  };
}

export default router;
