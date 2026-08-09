"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { settingsSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateThemeAction(theme: "DARK" | "LIGHT" | "SYSTEM") {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.settings.update({ where: { userId: user.id }, data: { theme } });
  revalidatePath("/", "layout");
}

export async function updateSettingsAction(input: Record<string, unknown>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const account = await prisma.tradingAccount.findFirst({ where: { userId: user.id } });
  const current = await prisma.settings.findUnique({ where: { userId: user.id } });

  const rateChanged =
    current && Number(current.usdToPkrRate) !== parsed.data.usdToPkrRate && account;
  const goldChanged =
    current && Number(current.goldPricePerGramPkr) !== parsed.data.goldPricePerGramPkr && account;

  await prisma.$transaction(async (tx) => {
    await tx.settings.update({
      where: { userId: user.id },
      data: { ...parsed.data, ratesUpdatedAt: new Date() },
    });

    if (rateChanged && account) {
      await tx.currencyRateHistory.create({
        data: { tradingAccountId: account.id, rate: parsed.data.usdToPkrRate },
      });
    }
    if (goldChanged && account) {
      await tx.goldRateHistory.create({
        data: { tradingAccountId: account.id, pricePerGramPkr: parsed.data.goldPricePerGramPkr },
      });
    }
  });

  revalidatePath("/", "layout");
  return {};
}
