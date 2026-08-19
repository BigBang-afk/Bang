import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const groups = await prisma.customerGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
  return jsonOk({ groups });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
  customerIds: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const group = await prisma.customerGroup.create({
      data: {
        name: data.name,
        description: data.description,
        type: "STATIC",
        members: { create: data.customerIds.map((customerId) => ({ customerId })) },
      },
      include: { _count: { select: { members: true } } },
    });

    return jsonOk({ group }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create customer group error", err);
    return jsonError("Something went wrong.", 500);
  }
}
