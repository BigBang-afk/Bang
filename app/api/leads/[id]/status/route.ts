import { setStatus } from "@/lib/leads";
import { handle, json, parseId, readJson } from "@/lib/api";
import { statusSchema } from "@/lib/validation";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseId((await ctx.params).id);
  const { status } = statusSchema.parse(await readJson(req));
  setStatus(id, status);
  return json({ ok: true });
});
