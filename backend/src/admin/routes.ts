import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth, requireAdmin } from "../auth/middleware";
import { asyncHandler } from "../util/asyncHandler";
import { approveAndBroadcastWithdrawal, rejectWithdrawal } from "../wallet/withdrawal";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, balanceCents: true, createdAt: true },
    });
    res.json(users.map((u) => ({ ...u, balanceCents: u.balanceCents.toString() })));
  })
);

router.get(
  "/deposits",
  asyncHandler(async (_req, res) => {
    const deposits = await prisma.deposit.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true } } },
    });
    res.json(deposits.map((d) => ({ ...d, amountUsdCents: d.amountUsdCents.toString() })));
  })
);

router.get(
  "/withdrawals",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const withdrawals = await prisma.withdrawal.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true } } },
    });
    res.json(withdrawals.map((w) => ({ ...w, amountUsdCents: w.amountUsdCents.toString() })));
  })
);

router.post(
  "/withdrawals/:id/approve",
  asyncHandler(async (req, res) => {
    await approveAndBroadcastWithdrawal(Number(req.params.id), req.auth!.userId);
    res.json({ ok: true });
  })
);

const rejectSchema = z.object({ note: z.string().min(1) });

router.post(
  "/withdrawals/:id/reject",
  asyncHandler(async (req, res) => {
    const { note } = rejectSchema.parse(req.body);
    await rejectWithdrawal(Number(req.params.id), req.auth!.userId, note);
    res.json({ ok: true });
  })
);

export default router;
