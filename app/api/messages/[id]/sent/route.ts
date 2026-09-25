import { markMessageSent } from "@/lib/leads";
import { handle, json, parseId } from "@/lib/api";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const result = markMessageSent(parseId((await ctx.params).id));
  return json({ ok: true, ...result });
});
