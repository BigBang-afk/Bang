import { addNote } from "@/lib/leads";
import { handle, json, parseId, readJson } from "@/lib/api";
import { noteSchema } from "@/lib/validation";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = parseId((await ctx.params).id);
  const { note } = noteSchema.parse(await readJson(req));
  addNote(id, note);
  return json({ ok: true }, 201);
});
