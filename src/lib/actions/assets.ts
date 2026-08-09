"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/require-auth";
import { assetSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";

export async function createAssetAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid asset" };
  const data = parsed.data;

  await prisma.asset.create({
    data: {
      tradingAccountId: account.id,
      category: data.category,
      name: data.name,
      valueUsd: data.valueUsd,
      valuePkr: data.valuePkr,
      notes: data.notes || null,
    },
  });

  revalidatePath("/wealth");
  revalidatePath("/dashboard");
  return {};
}

export async function updateAssetAction(input: Record<string, unknown>): Promise<ActionResult> {
  const { account } = await requireAccount();
  const parsed = assetSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { error: "Invalid asset" };
  const data = parsed.data;

  const existing = await prisma.asset.findFirst({ where: { id: data.id, tradingAccountId: account.id } });
  if (!existing) return { error: "Asset not found" };

  await prisma.asset.update({
    where: { id: data.id },
    data: { category: data.category, name: data.name, valueUsd: data.valueUsd, valuePkr: data.valuePkr, notes: data.notes || null },
  });

  revalidatePath("/wealth");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  const { account } = await requireAccount();
  const existing = await prisma.asset.findFirst({ where: { id, tradingAccountId: account.id } });
  if (!existing) return { error: "Asset not found" };
  await prisma.asset.delete({ where: { id } });
  revalidatePath("/wealth");
  revalidatePath("/dashboard");
  return {};
}
