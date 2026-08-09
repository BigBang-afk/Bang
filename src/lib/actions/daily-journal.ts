"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { dailyJournalSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function saveDailyJournalAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = dailyJournalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid journal data" };
  const data = parsed.data;

  const date = new Date(data.date);
  date.setHours(0, 0, 0, 0);

  await prisma.dailyJournal.upsert({
    where: { tradingAccountId_date: { tradingAccountId: account.id, date } },
    create: {
      tradingAccountId: account.id,
      date,
      todaysGoal: data.todaysGoal || null,
      marketOutlook: data.marketOutlook || null,
      tradingPlan: data.tradingPlan || null,
      whatWentWell: data.whatWentWell || null,
      whatWentWrong: data.whatWentWrong || null,
      mistakes: data.mistakes || null,
      lessonsLearned: data.lessonsLearned || null,
      emotionalState: data.emotionalState || null,
      confidence: data.confidence ?? null,
      disciplineScore: data.disciplineScore ?? null,
      emotionalControlScore: data.emotionalControlScore ?? null,
      executionScore: data.executionScore ?? null,
      riskManagementScore: data.riskManagementScore ?? null,
      overallScore: data.overallScore ?? null,
      screenshotUrl: data.screenshotUrl || null,
      tomorrowsImprovement: data.tomorrowsImprovement || null,
    },
    update: {
      todaysGoal: data.todaysGoal || null,
      marketOutlook: data.marketOutlook || null,
      tradingPlan: data.tradingPlan || null,
      whatWentWell: data.whatWentWell || null,
      whatWentWrong: data.whatWentWrong || null,
      mistakes: data.mistakes || null,
      lessonsLearned: data.lessonsLearned || null,
      emotionalState: data.emotionalState || null,
      confidence: data.confidence ?? null,
      disciplineScore: data.disciplineScore ?? null,
      emotionalControlScore: data.emotionalControlScore ?? null,
      executionScore: data.executionScore ?? null,
      riskManagementScore: data.riskManagementScore ?? null,
      overallScore: data.overallScore ?? null,
      screenshotUrl: data.screenshotUrl || null,
      tomorrowsImprovement: data.tomorrowsImprovement || null,
    },
  });

  revalidatePath("/journal");
  revalidatePath("/calendar");
  return {};
}
