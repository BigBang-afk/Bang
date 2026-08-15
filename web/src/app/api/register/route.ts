import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

const AVATAR_COLORS = ["#00e6a0", "#22d3ee", "#7c5cff", "#ff4d8d", "#ffb020"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userCount = await prisma.user.count();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: userCount === 0 ? "ADMIN" : "USER",
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
