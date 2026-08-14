"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AuthActionState } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { checkUsageLimit } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

const createWatchlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60, "Name is too long."),
});

export async function createWatchlistAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/watchlist");
  const parsed = createWatchlistSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Server-side entitlement check — the only place this is enforced. The
  // UI may also hide/disable the form near the limit, but that's a
  // convenience, not the gate.
  const usage = await checkUsageLimit(profile.id, "watchlists");
  if (!usage.allowed) {
    return {
      error: `You've reached your plan's limit of ${usage.limit} watchlist${usage.limit === 1 ? "" : "s"}. Upgrade to create more.`,
      code: "limit_reached",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("watchlists").insert({
    user_id: profile.id,
    name: parsed.data.name,
    is_default: false,
  });

  if (error) {
    return { error: "Couldn't create the watchlist. Please try again." };
  }

  revalidatePath("/dashboard/watchlist");
  return { error: null };
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

export async function addWatchlistItemAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const profile = await requireUser("/dashboard/watchlist");
  const parsed = addItemSchema.safeParse({
    watchlistId: formData.get("watchlistId"),
    assetId: formData.get("assetId"),
  });
  if (!parsed.success) {
    return { error: "Choose an asset to add." };
  }

  const usage = await checkUsageLimit(profile.id, "watchlist_items");
  if (!usage.allowed) {
    return {
      error: `You've reached your plan's limit of ${usage.limit} watchlist assets. Upgrade to track more.`,
      code: "limit_reached",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("watchlist_items").insert({
    watchlist_id: parsed.data.watchlistId,
    asset_id: parsed.data.assetId,
  });

  if (error) {
    return { error: "Couldn't add that asset. It may already be on this watchlist." };
  }

  revalidatePath("/dashboard/watchlist");
  return { error: null };
}

export async function removeWatchlistItemAction(formData: FormData) {
  await requireUser("/dashboard/watchlist");
  const itemId = z.string().uuid().safeParse(formData.get("itemId"));
  if (!itemId.success) return;

  const supabase = await createClient();
  await supabase.from("watchlist_items").delete().eq("id", itemId.data);

  revalidatePath("/dashboard/watchlist");
}
