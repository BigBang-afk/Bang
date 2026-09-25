import { scheduleFollowUp } from "@/lib/leads";
import { handle, json, parseId, readJson } from "@/lib/api";
import { scheduleFollowUpSchema } from "@/lib/validation";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseId((await ctx.params).id);
  const { due_date, note } = scheduleFollowUpSchema.parse(await readJson(req));
  scheduleFollowUp(id, due_date, note);
  return json({ ok: true }, 201);
});
