import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

interface LogActivityInput {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Best-effort activity log write — never throws, so a logging failure can never break a mutation. */
export async function logActivity(input: LogActivityInput) {
  try {
    const db = createAdminClient();
    await db.from("activity_logs").insert({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      description: input.description ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error("Failed to write activity log", err);
  }
}
