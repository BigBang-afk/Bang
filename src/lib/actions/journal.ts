"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const createEntrySchema = z.object({
  assetId: z.string().uuid().optional().or(z.literal("")),
  direction: z.enum(["long", "short"]),
  entryPrice: z.coerce.number().positive(),
  exitPrice: z.coerce.number().positive().optional().or(z.literal("")),
  positionSize: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createJournalEntryAction(formData: FormData) {
  const profile = await requireUser("/dashboard/journal");
  const parsed = createEntrySchema.safeParse({
    assetId: formData.get("assetId"),
    direction: formData.get("direction"),
    entryPrice: formData.get("entryPrice"),
    exitPrice: formData.get("exitPrice"),
    positionSize: formData.get("positionSize"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return;

  const { assetId, direction, entryPrice, exitPrice, positionSize, notes } = parsed.data;
  const hasExit = typeof exitPrice === "number";

  const supabase = await createClient();
  await supabase.from("trade_journal").insert({
    user_id: profile.id,
    asset_id: assetId || null,
    direction,
    entry_price: entryPrice,
    exit_price: hasExit ? exitPrice : null,
    position_size: positionSize,
    status: hasExit ? "closed" : "open",
    closed_at: hasExit ? new Date().toISOString() : null,
    notes: notes || null,
  });

  revalidatePath("/dashboard/journal");
}

export async function deleteJournalEntryAction(formData: FormData) {
  await requireUser("/dashboard/journal");
  const id = z.string().uuid().safeParse(formData.get("entryId"));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.from("trade_journal").delete().eq("id", id.data);

  revalidatePath("/dashboard/journal");
}
