import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

/** The seed script always creates this owner; integration tests reuse it as the acting user. */
export async function getSeededOwnerId(): Promise<string> {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@zarghoonjewellers.com";
  const owner = await prisma.user.findUniqueOrThrow({ where: { email } });
  return owner.id;
}

export async function getTestCategoryId(): Promise<string> {
  const category = await prisma.productCategory.findFirstOrThrow({ where: { name: "Rings" } });
  return category.id;
}

export async function getOrCreateRoleWithNoPermissions(): Promise<{ id: string; name: string }> {
  const name = `TEST_NO_PERMS_${uniqueSuffix()}`;
  const role = await prisma.role.create({ data: { name, isSystem: false } });
  return { id: role.id, name: role.name };
}
