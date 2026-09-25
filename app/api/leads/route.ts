import { createLead, listLeads } from "@/lib/leads";
import { handle, json, readJson } from "@/lib/api";
import { leadInputSchema } from "@/lib/validation";

export const GET = handle(async () => json({ leads: listLeads() }));

export const POST = handle(async (req: Request) => {
  const input = leadInputSchema.parse(await readJson(req));
  const id = createLead(input);
  return json({ id }, 201);
});
