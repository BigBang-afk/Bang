"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/dashboard/settings");
}
