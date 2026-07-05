import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db/client";
import { signToken } from "./jwt";
import { asyncHandler } from "../util/asyncHandler";
import { HttpError } from "../util/httpError";
import { createDepositAddressForUser } from "../wallet/hdWallet";
import { requireAuth } from "./middleware";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    // Best-effort: derive the user's on-chain deposit address up front so the
    // wallet page has something to show immediately after signup.
    try {
      await createDepositAddressForUser(user.id);
    } catch (err) {
      // Wallet config (mnemonic/RPC) may not be set up yet in dev; registration
      // should still succeed, the address can be created lazily on first visit.
      console.warn("Could not pre-create deposit address:", (err as Error).message);
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, balanceCents: user.balanceCents.toString() },
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, balanceCents: user.balanceCents.toString() },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      balanceCents: user.balanceCents.toString(),
    });
  })
);

export default router;
