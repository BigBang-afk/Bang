"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const createWatchlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60, "Name is too long."),
});

export async function createWatchlistAction(formData: FormData) {
  const profile = await requireUser("/dashboard/watchlist");
  const parsed = createWatchlistSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("watchlists").insert({
    user_id: profile.id,
    name: parsed.data.name,
    is_default: false,
  });

  revalidatePath("/dashboard/watchlist");
}

export async function deleteWatchlistAction(formData: FormData) {
  await requireUser("/dashboard/watchlist");
  const watchlistId = z.string().uuid().safeParse(formData.get("watchlistId"));
  if (!watchlistId.success) return;

  const supabase = await createClient();
  // RLS scopes this delete to the caller's own watchlists.
  await supabase.from("watchlists").delete().eq("id", watchlistId.data);

  revalidatePath("/dashboard/watchlist");
}

const addItemSchema = z.object({
  watchlistId: z.string().uuid(),
  assetId: z.string().uuid(),
});

export async function addWatchlistItemAction(formData: FormData) {
  await requireUser("/dashboard/watchlist");
  const parsed = addItemSchema.safeParse({
    watchlistId: formData.get("watchlistId"),
    assetId: formData.get("assetId"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("watchlist_items").insert({
    watchlist_id: parsed.data.watchlistId,
    asset_id: parsed.data.assetId,
  });

  revalidatePath("/dashboard/watchlist");
}

export async function removeWatchlistItemAction(formData: FormData) {
  await requireUser("/dashboard/watchlist");
  const itemId = z.string().uuid().safeParse(formData.get("itemId"));
  if (!itemId.success) return;

  const supabase = await createClient();
  await supabase.from("watchlist_items").delete().eq("id", itemId.data);

  revalidatePath("/dashboard/watchlist");
}
