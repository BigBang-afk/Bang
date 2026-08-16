import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { userHasPermission, assertPermission } from "@/lib/auth/dal";
import { AuthorizationError, PERMISSIONS } from "@/lib/auth/permissions";
import { getOrCreateRoleWithNoPermissions } from "./helpers/db-fixtures";

describe("Authorization — inventory permissions (Test 14)", () => {
  it("OWNER always has every permission, regardless of grants", async () => {
    const owner = { role: { id: "irrelevant-for-owner", name: "OWNER" } };
    await expect(userHasPermission(owner, PERMISSIONS.INVENTORY_MANAGE)).resolves.toBe(true);
    await expect(userHasPermission(owner, PERMISSIONS.CATEGORY_MANAGE)).resolves.toBe(true);
  });

  it("a role with no grants does not have inventory:manage", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = { role };

    await expect(userHasPermission(user, PERMISSIONS.INVENTORY_MANAGE)).resolves.toBe(false);
    await expect(assertPermission(user, PERMISSIONS.INVENTORY_MANAGE)).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("a role granted inventory:manage has it, but not other ungranted permissions", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: PERMISSIONS.INVENTORY_MANAGE },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.INVENTORY_MANAGE)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.CATEGORY_MANAGE)).resolves.toBe(false);
    await expect(assertPermission(user, PERMISSIONS.INVENTORY_MANAGE)).resolves.toBeUndefined();
  });

  it("ADMIN (seeded with every current permission) can manage inventory", async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = { role: adminRole };
    await expect(userHasPermission(user, PERMISSIONS.INVENTORY_MANAGE)).resolves.toBe(true);
  });
});

describe("Authorization — sales permissions (Test 16)", () => {
  it("a role with no grants cannot view, create, or return sales", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = { role };

    await expect(userHasPermission(user, PERMISSIONS.SALES_VIEW)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.SALES_CREATE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.SALES_RETURN)).resolves.toBe(false);
    await expect(assertPermission(user, PERMISSIONS.SALES_CREATE)).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("a role granted only sales:view cannot create sales or approve returns", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: PERMISSIONS.SALES_VIEW },
    });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.SALES_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.SALES_CREATE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.SALES_RETURN)).resolves.toBe(false);
  });

  it("OWNER always has sales:create and sales:return regardless of grants", async () => {
    const owner = { role: { id: "irrelevant-for-owner", name: "OWNER" } };
    await expect(userHasPermission(owner, PERMISSIONS.SALES_CREATE)).resolves.toBe(true);
    await expect(userHasPermission(owner, PERMISSIONS.SALES_RETURN)).resolves.toBe(true);
  });
});
