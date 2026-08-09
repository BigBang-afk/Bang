"use server";

import { requireAccount } from "@/lib/require-auth";
import { seedDemoData, deleteDemoData } from "@/lib/demo-data";
import { toNumber } from "@/lib/money";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function loadDemoDataAction(): Promise<ActionResult> {
  const { account, settings } = await requireAccount();
  await seedDemoData(account.id, toNumber(settings.usdToPkrRate), toNumber(settings.goldPricePerGramPkr));
  revalidatePath("/", "layout");
  return {};
}

export async function deleteDemoDataAction(): Promise<ActionResult> {
  const { account } = await requireAccount();
  await deleteDemoData(account.id);
  revalidatePath("/", "layout");
  return {};
}
