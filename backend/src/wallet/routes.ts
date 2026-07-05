import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth } from "../auth/middleware";
import { asyncHandler } from "../util/asyncHandler";
import { createDepositAddressForUser } from "./hdWallet";
import { requestWithdrawal } from "./withdrawal";

const router = Router();

router.get(
  "/address",
  requireAuth,
  asyncHandler(async (req, res) => {
    const addr = await createDepositAddressForUser(req.auth!.userId);
    res.json({ address: addr.address, network: "ethereum", supportedAssets: ["ETH", "USDT"] });
  })
);

router.get(
  "/deposits",
  requireAuth,
  asyncHandler(async (req, res) => {
    const deposits = await prisma.deposit.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(deposits.map((d) => ({ ...d, amountUsdCents: d.amountUsdCents.toString() })));
  })
);

const withdrawSchema = z.object({
  toAddress: z.string(),
  asset: z.enum(["ETH", "USDT"]),
  amountUsdCents: z.number().int().positive(),
});

router.post(
  "/withdrawals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = withdrawSchema.parse(req.body);
    const withdrawal = await requestWithdrawal({
      userId: req.auth!.userId,
      toAddress: body.toAddress,
      asset: body.asset,
      amountUsdCents: BigInt(body.amountUsdCents),
    });
    res.status(201).json({ ...withdrawal, amountUsdCents: withdrawal.amountUsdCents.toString() });
  })
);

router.get(
  "/withdrawals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(withdrawals.map((w) => ({ ...w, amountUsdCents: w.amountUsdCents.toString() })));
  })
);

export default router;
