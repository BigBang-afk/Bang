"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function updateAccountPreferencesAction(input: { mainTradingType: string }): Promise<ActionResult> {
  const { account } = await requireAccount();
  const validTypes = ["FOREX", "CRYPTO", "BINARY", "STOCKS", "MIXED"];
  if (!validTypes.includes(input.mainTradingType)) return { error: "Invalid trading type" };

  await prisma.tradingAccount.update({
    where: { id: account.id },
    data: { mainTradingType: input.mainTradingType },
  });

  revalidatePath("/settings");
  return {};
}
