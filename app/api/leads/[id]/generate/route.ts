import { getAgent, getLead, saveAIResult } from "@/lib/leads";
import { errorJson, handle, json, parseId } from "@/lib/api";
import { getAIProvider } from "@/lib/ai/provider";
import { generateFollowUps } from "@/lib/ai/generate";

export const maxDuration = 120;

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseId((await ctx.params).id);
  const lead = getLead(id);
  if (!lead) return errorJson("Lead not found", 404);

  const { result, warnings, provider } = await generateFollowUps(getAIProvider(), lead, getAgent());
  saveAIResult(id, result, warnings);
  return json({ ok: true, provider });
});
