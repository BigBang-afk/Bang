import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ALL_PERMISSION_CODES, PERMISSIONS } from '../src/modules/identity-access/permissions.constants';

const prisma = new PrismaClient();

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.USERS_READ]: 'View users',
  [PERMISSIONS.USERS_CREATE]: 'Create new users',
  [PERMISSIONS.USERS_UPDATE]: 'Edit user details and status',
  [PERMISSIONS.USERS_DEACTIVATE]: 'Deactivate users',
  [PERMISSIONS.ROLES_READ]: 'View roles and their permissions',
  [PERMISSIONS.ROLES_MANAGE]: 'Create, edit, and delete roles',
  [PERMISSIONS.PERMISSIONS_READ]: 'View the list of available permissions',
  [PERMISSIONS.AUDIT_READ]: 'View the audit log',
};

const STAFF_READ_ONLY_PERMISSIONS: string[] = [
  PERMISSIONS.USERS_READ,
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.PERMISSIONS_READ,
];

async function main() {
  console.log('Seeding identity-access permissions...');
  for (const code of ALL_PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        module: 'identity-access',
        description: PERMISSION_DESCRIPTIONS[code],
      },
    });
  }

  const allPermissions = await prisma.permission.findMany();

  console.log('Seeding system roles...');
  const ownerRole = await prisma.role.upsert({
    where: { name: 'OWNER' },
    update: {},
    create: {
      name: 'OWNER',
      description: 'Full access to every module. Reserved for the business owner.',
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Day-to-day administration of users, roles, and system configuration.',
      isSystem: true,
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'STAFF' },
    update: {},
    create: {
      name: 'STAFF',
      description: 'Read-only access to identity & access data. Baseline role for future staff.',
      isSystem: true,
    },
  });

  async function setRolePermissions(roleId: string, permissionIds: string[]) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  await setRolePermissions(
    ownerRole.id,
    allPermissions.map((p) => p.id),
  );
  await setRolePermissions(
    adminRole.id,
    allPermissions.map((p) => p.id),
  );
  await setRolePermissions(
    staffRole.id,
    allPermissions.filter((p) => STAFF_READ_ONLY_PERMISSIONS.includes(p.code)).map((p) => p.id),
  );

  const ownerEmail = (process.env.SEED_OWNER_EMAIL ?? 'owner@bang.local').toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe123!';

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner) {
    console.log(`Owner user ${ownerEmail} already exists, skipping bootstrap user creation.`);
  } else {
    console.log(`Creating bootstrap owner user ${ownerEmail}...`);
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        firstName: 'Store',
        lastName: 'Owner',
        passwordHash,
        status: 'ACTIVE',
      },
    });
    await prisma.userRole.create({
      data: { userId: owner.id, roleId: ownerRole.id },
    });
    console.log(
      `Bootstrap owner created. Log in with ${ownerEmail} / the SEED_OWNER_PASSWORD you configured, then change the password.`,
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
