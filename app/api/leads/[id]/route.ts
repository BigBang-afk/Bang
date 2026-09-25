import { deleteLead, getLeadDetail, updateLead } from "@/lib/leads";
import { errorJson, handle, json, parseId, readJson } from "@/lib/api";
import { leadInputSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const detail = getLeadDetail(parseId((await ctx.params).id));
  if (!detail) return errorJson("Lead not found", 404);
  return json(detail);
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const id = parseId((await ctx.params).id);
  const input = leadInputSchema.parse(await readJson(req));
  updateLead(id, input);
  return json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  deleteLead(parseId((await ctx.params).id));
  return json({ ok: true });
});
