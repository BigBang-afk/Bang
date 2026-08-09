"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { dailyPlanSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function saveDailyPlanAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = dailyPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid plan data" };
  const data = parsed.data;

  const date = new Date(data.date);
  date.setHours(0, 0, 0, 0);

  const dailyTargetUsd = data.startingBalance * (data.dailyTargetPct / 100);
  const dailyMaxLossUsd = data.startingBalance * (data.dailyMaxLossPct / 100);
  const riskPerTradeUsd = data.startingBalance * (data.riskPerTradePct / 100);

  await prisma.dailyPlan.upsert({
    where: { tradingAccountId_date: { tradingAccountId: account.id, date } },
    create: {
      tradingAccountId: account.id,
      date,
      startingBalance: data.startingBalance,
      dailyTargetPct: data.dailyTargetPct,
      dailyTargetUsd,
      dailyMaxLossPct: data.dailyMaxLossPct,
      dailyMaxLossUsd,
      riskPerTradePct: data.riskPerTradePct,
      riskPerTradeUsd,
      maxTrades: data.maxTrades,
      maxConsecutiveLosses: data.maxConsecutiveLosses,
      session1Target: data.session1Target ?? null,
      session2Target: data.session2Target ?? null,
      notes: data.notes || null,
    },
    update: {
      startingBalance: data.startingBalance,
      dailyTargetPct: data.dailyTargetPct,
      dailyTargetUsd,
      dailyMaxLossPct: data.dailyMaxLossPct,
      dailyMaxLossUsd,
      riskPerTradePct: data.riskPerTradePct,
      riskPerTradeUsd,
      maxTrades: data.maxTrades,
      maxConsecutiveLosses: data.maxConsecutiveLosses,
      session1Target: data.session1Target ?? null,
      session2Target: data.session2Target ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/", "layout");
  return {};
}

export async function updatePlanStatusAction(planId: string, status: string) {
  const { account } = await requireAccount();
  const plan = await prisma.dailyPlan.findFirst({ where: { id: planId, tradingAccountId: account.id } });
  if (!plan) return { error: "Plan not found" };
  await prisma.dailyPlan.update({ where: { id: planId }, data: { status } });
  revalidatePath("/daily-plan");
  return {};
}
