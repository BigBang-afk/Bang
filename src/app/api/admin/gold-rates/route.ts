import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { goldRateInputSchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";
import { getCurrentGoldRates } from "@/lib/gold";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const purity = searchParams.get("purity");
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? "100")));

  const [current, history] = await Promise.all([
    getCurrentGoldRates(),
    prisma.goldRate.findMany({
      where: purity ? { purity: purity as "K24" | "K21" | "K18" } : undefined,
      orderBy: { effectiveAt: "desc" },
      take: limit,
      include: { updatedByAdmin: { select: { name: true } } },
    }),
  ]);

  return jsonOk({ current, history });
}

/**
 * A new rate is ALWAYS a new append-only row (see spec section 10/28) —
 * history is never overwritten. Product prices that depend on this purity
 * pick up the new rate automatically the next time they are read, because
 * pricing always reads the latest GoldRate row rather than a cached value.
 */
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = goldRateInputSchema.parse(body);

    const rate = await prisma.goldRate.create({
      data: {
        purity: data.purity,
        ratePerGram: data.ratePerGram,
        effectiveAt: data.effectiveAt ?? new Date(),
        notes: data.notes,
        updatedByAdminId: session.adminId,
      },
    });

    await logAdminActivity({
      adminId: session.adminId,
      action: "GOLD_RATE_CHANGED",
      description: `Set ${data.purity} rate to PKR ${data.ratePerGram}/g`,
      entityType: "GoldRate",
      entityId: rate.id,
      request,
    });

    return jsonOk({ rate }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create gold rate error", err);
    return jsonError("Something went wrong.", 500);
  }
}
