"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function addWatchlistSymbol(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  if (!symbol) return;

  await prisma.watchlistItem.upsert({
    where: { userId_symbol: { userId: session.user.id, symbol } },
    update: {},
    create: { userId: session.user.id, symbol },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/watchlist");
}

export async function removeWatchlistSymbol(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.watchlistItem.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/watchlist");
}
