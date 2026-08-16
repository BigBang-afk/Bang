import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  ALL_PERMISSION_CODES,
  IDENTITY_PERMISSION_CODES,
  PERMISSIONS,
} from '../src/modules/identity-access/permissions.constants';

const prisma = new PrismaClient();

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.USERS_READ]: 'View users',
  [PERMISSIONS.USERS_CREATE]: 'Create new users',
  [PERMISSIONS.USERS_UPDATE]: 'Edit user details and status',
  [PERMISSIONS.USERS_DISABLE]: 'Disable users',
  [PERMISSIONS.ROLES_READ]: 'View roles and their permissions',
  [PERMISSIONS.ROLES_MANAGE]: 'Create, edit, and delete roles; assign roles to users',
  [PERMISSIONS.PERMISSIONS_READ]: 'View the list of available permissions',
  [PERMISSIONS.BRANCHES_READ]: 'View branches',
  [PERMISSIONS.BRANCHES_MANAGE]: 'Create and edit branches',
  [PERMISSIONS.AUDIT_READ]: 'View the audit log',
  [PERMISSIONS.SETTINGS_MANAGE]: 'Manage system-wide settings',
  [PERMISSIONS.PRODUCTS_READ]: 'View products',
  [PERMISSIONS.PRODUCTS_CREATE]: 'Create products',
  [PERMISSIONS.PRODUCTS_UPDATE]: 'Edit products',
  [PERMISSIONS.INVENTORY_READ]: 'View inventory',
  [PERMISSIONS.INVENTORY_ADJUST]: 'Adjust inventory quantities',
  [PERMISSIONS.SALES_READ]: 'View sales',
  [PERMISSIONS.SALES_CREATE]: 'Create sales',
  [PERMISSIONS.SALES_REVERSE]: 'Reverse/void sales',
  [PERMISSIONS.CUSTOMERS_READ]: 'View customers',
  [PERMISSIONS.CUSTOMERS_CREATE]: 'Create customers',
  [PERMISSIONS.CUSTOMERS_UPDATE]: 'Edit customers',
  [PERMISSIONS.FINANCE_READ]: 'View financial records',
  [PERMISSIONS.FINANCE_MANAGE]: 'Manage expenses, ledgers, and financial records',
  [PERMISSIONS.REPORTS_READ]: 'View reports',
  [PERMISSIONS.MARKETING_READ]: 'View marketing content',
  [PERMISSIONS.MARKETING_MANAGE]: 'Manage product content and marketing campaigns',
};

function moduleFor(code: string): string {
  if ((IDENTITY_PERMISSION_CODES as string[]).includes(code)) return 'identity';
  return code.split('.')[0];
}

// Non-OWNER roles only ever get read/operate permissions for their domain —
// never users.create/update/disable, roles.manage, or settings.manage.
// That is what actually prevents privilege escalation (spec §19): the
// *catalog* being granular doesn't help if every role is handed the same
// wide permission set anyway.
const ROLE_DEFINITIONS: Array<{ name: string; description: string; permissions: string[] }> = [
  {
    name: 'OWNER',
    description: 'Full system access.',
    permissions: [...ALL_PERMISSION_CODES],
  },
  {
    name: 'BRANCH_MANAGER',
    description: 'Full operational access within assigned branch(es).',
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.SALES_READ,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_REVERSE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_UPDATE,
      PERMISSIONS.REPORTS_READ,
    ],
  },
  {
    name: 'CASHIER',
    description: 'POS-related permissions only.',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.SALES_READ,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_CREATE,
    ],
  },
  {
    name: 'KARIGAR_COORDINATOR',
    description: 'Karigar and work-order related permissions.',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.REPORTS_READ,
    ],
  },
  {
    name: 'ACCOUNTANT',
    description: 'Finance, expenses, ledgers, and reports.',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.FINANCE_READ,
      PERMISSIONS.FINANCE_MANAGE,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.SALES_READ,
      PERMISSIONS.CUSTOMERS_READ,
    ],
  },
  {
    name: 'MARKETING',
    description: 'Product content and marketing functionality.',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.MARKETING_READ,
      PERMISSIONS.MARKETING_MANAGE,
    ],
  },
];

async function main() {
  console.log('Seeding permission catalog...');
  for (const code of ALL_PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      update: { module: moduleFor(code), description: PERMISSION_DESCRIPTIONS[code] },
      create: { code, module: moduleFor(code), description: PERMISSION_DESCRIPTIONS[code] },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const byCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  console.log('Seeding roles...');
  const roleIdByName = new Map<string, string>();
  for (const def of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: { description: def.description },
      create: { name: def.name, description: def.description, isSystem: true },
    });
    roleIdByName.set(def.name, role.id);

    const permissionIds = def.permissions.map((code) => byCode.get(code)!).filter(Boolean);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }

  console.log('Seeding default branch...');
  await prisma.branch.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { code: 'MAIN', name: 'Main Branch' },
  });

  const ownerEmail = process.env.SEED_OWNER_EMAIL?.toLowerCase();
  const ownerUsername = process.env.SEED_OWNER_USERNAME?.toLowerCase() ?? 'owner';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;

  if (!ownerPassword) {
    throw new Error(
      'SEED_OWNER_PASSWORD is not set. Set it in your environment before running the seed — ' +
        'the bootstrap owner account is never created with a hard-coded password.',
    );
  }

  const existingOwner = await prisma.user.findFirst({
    where: { OR: [{ email: ownerEmail }, { username: ownerUsername }] },
  });

  if (existingOwner) {
    console.log(`Owner user (${ownerUsername}) already exists, skipping bootstrap user creation.`);
  } else {
    console.log(`Creating bootstrap OWNER user "${ownerUsername}"...`);
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const owner = await prisma.user.create({
      data: {
        employeeCode: 'ZJ-0001',
        username: ownerUsername,
        email: ownerEmail,
        firstName: 'Store',
        lastName: 'Owner',
        passwordHash,
        status: 'ACTIVE',
        branchAccessType: 'ALL', // ALL bypasses the branch join entirely — no UserBranch rows needed.
        roles: { create: [{ roleId: roleIdByName.get('OWNER')! }] },
      },
    });
    console.log(
      `Bootstrap owner created (${owner.username}). Log in with SEED_OWNER_USERNAME / ` +
        'SEED_OWNER_PASSWORD, then change the password immediately.',
    );
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
