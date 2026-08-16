import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "../src/lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PERMISSION_CATALOG: { key: string; module: string; description: string }[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, module: "DASHBOARD", description: "View the dashboard." },
  {
    key: PERMISSIONS.GOLD_RATE_CREATE,
    module: "GOLD_RATE",
    description: "Set the daily gold rate.",
  },
  {
    key: PERMISSIONS.GOLD_RATE_READ,
    module: "GOLD_RATE",
    description: "View gold rate history.",
  },
  {
    key: PERMISSIONS.SETTINGS_MANAGE,
    module: "SETTINGS",
    description: "Manage business settings.",
  },
  { key: PERMISSIONS.USER_MANAGE, module: "USER", description: "Manage staff accounts." },
];

async function main() {
  console.log("Seeding permissions...");
  const permissions = await Promise.all(
    PERMISSION_CATALOG.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: { module: permission.module, description: permission.description },
        create: permission,
      }),
    ),
  );

  console.log("Seeding roles...");
  const ownerRole = await prisma.role.upsert({
    where: { name: "OWNER" },
    update: {},
    create: {
      name: "OWNER",
      description: "Full, unrestricted access to every module.",
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrative access. Individual permissions are configurable.",
      isSystem: true,
    },
  });

  // OWNER bypasses permission checks in code, but we still attach every
  // permission so the role reads correctly anywhere it's displayed.
  for (const role of [ownerRole, adminRole]) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log("Seeding default owner user...");
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@zarghoonjewellers.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      name: "Zarghoon Owner",
      email: ownerEmail,
      passwordHash,
      roleId: ownerRole.id,
      isActive: true,
    },
  });

  console.log("Seeding default business settings...");
  await prisma.systemSetting.upsert({
    where: { key: "business.name" },
    update: {},
    create: { key: "business.name", value: "Zarghoon Jewellers" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "business.currency" },
    update: {},
    create: { key: "business.currency", value: "PKR" },
  });

  console.log("\nSeed complete.");
  console.log(`Owner login: ${ownerEmail} / ${ownerPassword}`);
  console.log("Change this password after first login in a real deployment.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
