import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "../src/lib/auth/permissions";
import { SETTINGS_KEYS, discountLimitKey } from "../src/lib/settings-keys";

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
  {
    key: PERMISSIONS.INVENTORY_VIEW,
    module: "INVENTORY",
    description: "View inventory and stock.",
  },
  {
    key: PERMISSIONS.INVENTORY_MANAGE,
    module: "INVENTORY",
    description: "Create, edit, and archive stock.",
  },
  {
    key: PERMISSIONS.CATEGORY_MANAGE,
    module: "INVENTORY",
    description: "Create and manage product categories.",
  },
  {
    key: PERMISSIONS.BARCODE_PRINT,
    module: "INVENTORY",
    description: "Print ZJ barcode labels.",
  },
  { key: PERMISSIONS.SALES_VIEW, module: "SALES", description: "View sales history and invoices." },
  {
    key: PERMISSIONS.SALES_CREATE,
    module: "SALES",
    description: "Operate the POS and complete sales.",
  },
  {
    key: PERMISSIONS.SALES_RETURN,
    module: "SALES",
    description: "Approve a return and move inventory back to Returned.",
  },
  { key: PERMISSIONS.CUSTOMERS_VIEW, module: "CUSTOMERS", description: "Search and view customers." },
  {
    key: PERMISSIONS.CUSTOMERS_CREATE,
    module: "CUSTOMERS",
    description: "Create new customer records.",
  },
  {
    key: PERMISSIONS.CUSTOMERS_MANAGE,
    module: "CUSTOMERS",
    description: "Edit, archive, and change the status/type of existing customers.",
  },
  { key: PERMISSIONS.CUSTOMERS_NOTES, module: "CUSTOMERS", description: "Add customer notes." },
  {
    key: PERMISSIONS.CUSTOMERS_LEDGER,
    module: "CUSTOMERS",
    description: "View the customer financial ledger.",
  },
  {
    key: PERMISSIONS.CUSTOMERS_PAYMENT,
    module: "CUSTOMERS",
    description: "Record a customer payment against their outstanding balance.",
  },
  {
    key: PERMISSIONS.CUSTOMERS_EXPORT,
    module: "CUSTOMERS",
    description: "Export customer data to CSV.",
  },
  {
    key: PERMISSIONS.CUSTOMERS_SEGMENTS,
    module: "CUSTOMERS",
    description: "View VIP/inactive/segment analytics.",
  },
];

const DEFAULT_CATEGORIES = [
  "Rings",
  "Necklaces",
  "Bangles",
  "Bracelets",
  "Earrings",
  "Chains",
  "Pendants",
  "Sets",
  "Nose Pins",
  "Boys/Men Jewelry",
  "Girls/Women Jewelry",
  "Diamond Jewelry",
  "Silver Jewelry",
  "Other",
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
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.BUSINESS_ADDRESS },
    update: {},
    create: { key: SETTINGS_KEYS.BUSINESS_ADDRESS, value: "" },
  });
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.BUSINESS_PHONE },
    update: {},
    create: { key: SETTINGS_KEYS.BUSINESS_PHONE, value: "" },
  });
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.TAX_ENABLED },
    update: {},
    create: { key: SETTINGS_KEYS.TAX_ENABLED, value: "false" },
  });
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.TAX_PERCENT },
    update: {},
    create: { key: SETTINGS_KEYS.TAX_PERCENT, value: "0" },
  });
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.INVOICE_FOOTER_TEXT },
    update: {},
    create: {
      key: SETTINGS_KEYS.INVOICE_FOOTER_TEXT,
      value: "Thank you for shopping with Zarghoon Jewellers.",
    },
  });

  console.log("Seeding customer CRM settings...");
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.VIP_SPENDING_THRESHOLD },
    update: {},
    create: {
      key: SETTINGS_KEYS.VIP_SPENDING_THRESHOLD,
      value: "2000000",
      description: "Total lifetime spending at/above which a customer earns the VIP badge.",
    },
  });
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.CUSTOMER_INACTIVITY_DAYS },
    update: {},
    create: {
      key: SETTINGS_KEYS.CUSTOMER_INACTIVITY_DAYS,
      value: "90",
      description: "Days since a customer's last completed purchase before they're considered inactive.",
    },
  });
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEYS.CUSTOMER_OVERPAYMENT_ALLOWED },
    update: {},
    create: {
      key: SETTINGS_KEYS.CUSTOMER_OVERPAYMENT_ALLOWED,
      value: "false",
      description: "Whether a customer payment may exceed their current outstanding balance.",
    },
  });

  console.log("Seeding discount limits by role...");
  const DEFAULT_DISCOUNT_LIMITS: Record<string, string> = {
    OWNER: "100",
    ADMIN: "50",
    CASHIER: "10",
    SALESPERSON: "10",
  };
  for (const [roleName, maxPercent] of Object.entries(DEFAULT_DISCOUNT_LIMITS)) {
    const key = discountLimitKey(roleName);
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: maxPercent,
        description: `Maximum discount percentage a ${roleName} can apply at checkout.`,
      },
    });
  }

  console.log("Seeding default product categories...");
  for (const name of DEFAULT_CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: true },
    });
  }

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
