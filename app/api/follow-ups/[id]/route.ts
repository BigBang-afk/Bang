import { updateFollowUp } from "@/lib/leads";
import { handle, json, parseId, readJson } from "@/lib/api";
import { followUpActionSchema } from "@/lib/validation";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseId((await ctx.params).id);
  const action = followUpActionSchema.parse(await readJson(req));
  const result = updateFollowUp(id, action);
  return json({ ok: true, ...result });
});
