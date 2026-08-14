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

/**
 * Same as addWatchlistItemAction but void (no useActionState) — used from
 * the Markets page's per-row "Add to watchlist" menu, where a full form
 * with error UI would be overkill. Still enforces the same entitlement
 * check server-side.
 */
export async function quickAddToWatchlistAction(formData: FormData) {
  const profile = await requireUser("/dashboard/markets");
  const parsed = addItemSchema.safeParse({
    watchlistId: formData.get("watchlistId"),
    assetId: formData.get("assetId"),
  });
  if (!parsed.success) return;

  const usage = await checkUsageLimit(profile.id, "watchlist_items");
  if (!usage.allowed) return;

  const supabase = await createClient();
  await supabase.from("watchlist_items").insert({
    watchlist_id: parsed.data.watchlistId,
    asset_id: parsed.data.assetId,
  });

  revalidatePath("/dashboard/watchlist");
  revalidatePath("/dashboard/markets");
}

const reorderSchema = z.object({
  watchlistId: z.string().uuid(),
  itemId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

/**
 * Swaps an item's sort_order with its immediate neighbor in the same
 * direction. Simple and correct for the common case of nudging an item a
 * few places; a drag-and-drop reorder can replace this later without
 * changing the schema (sort_order already exists for exactly this).
 */
export async function reorderWatchlistItemAction(formData: FormData) {
  await requireUser("/dashboard/watchlist");
  const parsed = reorderSchema.safeParse({
    watchlistId: formData.get("watchlistId"),
    itemId: formData.get("itemId"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("watchlist_items")
    .select("id, sort_order")
    .eq("watchlist_id", parsed.data.watchlistId)
    .order("sort_order", { ascending: true });

  if (!items) return;

  const index = items.findIndex((i) => i.id === parsed.data.itemId);
  const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swap = items[swapIndex];

  await Promise.all([
    supabase
      .from("watchlist_items")
      .update({ sort_order: swap.sort_order })
      .eq("id", current.id),
    supabase
      .from("watchlist_items")
      .update({ sort_order: current.sort_order })
      .eq("id", swap.id),
  ]);

  revalidatePath("/dashboard/watchlist");
}
