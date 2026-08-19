import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { messageTemplateSchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const templates = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return jsonOk({ templates });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = messageTemplateSchema.parse(body);
    const template = await prisma.messageTemplate.create({ data });
    return jsonOk({ template }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create template error", err);
    return jsonError("Something went wrong.", 500);
  }
}
