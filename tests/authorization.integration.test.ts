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

describe("Authorization — customer CRM permissions (Test 19)", () => {
  it("a role with no grants has none of the customers:* permissions", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = { role };

    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_VIEW)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_CREATE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_NOTES)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_LEDGER)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_PAYMENT)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_EXPORT)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_SEGMENTS)).resolves.toBe(false);
    await expect(assertPermission(user, PERMISSIONS.CUSTOMERS_MANAGE)).rejects.toThrow(AuthorizationError);
  });

  it("a role granted only customers:view cannot manage, pay, or export", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: PERMISSIONS.CUSTOMERS_VIEW },
    });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_PAYMENT)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_EXPORT)).resolves.toBe(false);
  });

  it("a role granted customers:notes can add notes without being able to manage or export", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: PERMISSIONS.CUSTOMERS_NOTES },
    });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_NOTES)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_EXPORT)).resolves.toBe(false);
  });

  it("OWNER always has every customers:* permission regardless of grants", async () => {
    const owner = { role: { id: "irrelevant-for-owner", name: "OWNER" } };
    await expect(userHasPermission(owner, PERMISSIONS.CUSTOMERS_MANAGE)).resolves.toBe(true);
    await expect(userHasPermission(owner, PERMISSIONS.CUSTOMERS_EXPORT)).resolves.toBe(true);
    await expect(userHasPermission(owner, PERMISSIONS.CUSTOMERS_SEGMENTS)).resolves.toBe(true);
  });

  it("ADMIN (seeded with every current permission) can manage customers and export", async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = { role: adminRole };
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.CUSTOMERS_EXPORT)).resolves.toBe(true);
  });
});

describe("Authorization — karigar/supplier/purchase/gold-ledger/cash permissions (Test 21)", () => {
  const PHASE5_PERMISSIONS = [
    PERMISSIONS.KARIGARS_VIEW,
    PERMISSIONS.KARIGARS_MANAGE,
    PERMISSIONS.KARIGARS_GOLD,
    PERMISSIONS.KARIGARS_CASH,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.GOLD_LEDGER_VIEW,
    PERMISSIONS.GOLD_LEDGER_RECONCILE,
    PERMISSIONS.CASH_VIEW,
    PERMISSIONS.CASH_MANAGE,
    PERMISSIONS.CASH_RECONCILE,
  ] as const;

  it("a role with no grants has none of the Phase 5 permissions", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = { role };

    for (const key of PHASE5_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(false);
    }
    await expect(assertPermission(user, PERMISSIONS.KARIGARS_MANAGE)).rejects.toThrow(AuthorizationError);
    await expect(assertPermission(user, PERMISSIONS.PURCHASES_CREATE)).rejects.toThrow(AuthorizationError);
    await expect(assertPermission(user, PERMISSIONS.CASH_RECONCILE)).rejects.toThrow(AuthorizationError);
  });

  it("a role granted only karigars:view cannot manage karigars, touch gold, or touch cash", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.KARIGARS_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.KARIGARS_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.KARIGARS_MANAGE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.KARIGARS_GOLD)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.KARIGARS_CASH)).resolves.toBe(false);
  });

  it("a role granted only purchases:view cannot create purchases", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.PURCHASES_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.PURCHASES_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.PURCHASES_CREATE)).resolves.toBe(false);
  });

  it("a role granted only gold_ledger:view cannot reconcile gold", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.GOLD_LEDGER_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.GOLD_LEDGER_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.GOLD_LEDGER_RECONCILE)).resolves.toBe(false);
  });

  it("a role granted only cash:view cannot manage or reconcile cash", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.CASH_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.CASH_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.CASH_MANAGE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.CASH_RECONCILE)).resolves.toBe(false);
  });

  it("OWNER always has every Phase 5 permission regardless of grants", async () => {
    const owner = { role: { id: "irrelevant-for-owner", name: "OWNER" } };
    for (const key of PHASE5_PERMISSIONS) {
      await expect(userHasPermission(owner, key)).resolves.toBe(true);
    }
  });

  it("ADMIN (seeded with every current permission) has every Phase 5 permission", async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = { role: adminRole };
    for (const key of PHASE5_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(true);
    }
  });
});

describe("Authorization — accounting permissions (Test 23)", () => {
  const PHASE6_PERMISSIONS = [
    PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
    PERMISSIONS.ACCOUNTING_EXPENSES_VIEW,
    PERMISSIONS.ACCOUNTING_EXPENSES_CREATE,
    PERMISSIONS.ACCOUNTING_EXPENSES_MANAGE,
    PERMISSIONS.ACCOUNTING_INCOME_MANAGE,
    PERMISSIONS.ACCOUNTING_DAILY_CLOSING,
    PERMISSIONS.ACCOUNTING_DAILY_CLOSING_REOPEN,
    PERMISSIONS.ACCOUNTING_RECONCILE,
    PERMISSIONS.ACCOUNTING_EXPORT,
  ] as const;

  it("a role with no grants has none of the Phase 6 permissions", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = { role };

    for (const key of PHASE6_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(false);
    }
    await expect(assertPermission(user, PERMISSIONS.ACCOUNTING_EXPENSES_CREATE)).rejects.toThrow(AuthorizationError);
    await expect(assertPermission(user, PERMISSIONS.ACCOUNTING_DAILY_CLOSING_REOPEN)).rejects.toThrow(AuthorizationError);
    await expect(assertPermission(user, PERMISSIONS.ACCOUNTING_EXPORT)).rejects.toThrow(AuthorizationError);
  });

  it("a role granted only accounting:expenses_view cannot create, manage, or export", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.ACCOUNTING_EXPENSES_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPENSES_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPENSES_CREATE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPENSES_MANAGE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPORT)).resolves.toBe(false);
  });

  it("a role granted only accounting:daily_closing cannot reopen a closed day", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.ACCOUNTING_DAILY_CLOSING } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_DAILY_CLOSING)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_DAILY_CLOSING_REOPEN)).resolves.toBe(false);
  });

  it("a role granted only accounting:reports_view cannot reconcile or export", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.ACCOUNTING_REPORTS_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_REPORTS_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_RECONCILE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.ACCOUNTING_EXPORT)).resolves.toBe(false);
  });

  it("OWNER always has every Phase 6 permission regardless of grants", async () => {
    const owner = { role: { id: "irrelevant-for-owner", name: "OWNER" } };
    for (const key of PHASE6_PERMISSIONS) {
      await expect(userHasPermission(owner, key)).resolves.toBe(true);
    }
  });

  it("ADMIN (seeded with every current permission) has every Phase 6 permission", async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = { role: adminRole };
    for (const key of PHASE6_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(true);
    }
  });
});

describe("Authorization — AI marketing permissions (Test 19/23 combined)", () => {
  const PHASE7_PERMISSIONS = [
    PERMISSIONS.MARKETING_VIEW,
    PERMISSIONS.MARKETING_CAMPAIGNS_CREATE,
    PERMISSIONS.MARKETING_CAMPAIGNS_APPROVE,
    PERMISSIONS.MARKETING_CAMPAIGNS_LAUNCH,
    PERMISSIONS.MARKETING_CAMPAIGNS_MANAGE,
    PERMISSIONS.MARKETING_CONTENT_CREATE,
    PERMISSIONS.MARKETING_CONTENT_APPROVE,
    PERMISSIONS.MARKETING_AUTOMATION_MANAGE,
    PERMISSIONS.MARKETING_AI_ASSISTANT_USE,
    PERMISSIONS.MARKETING_SETTINGS_MANAGE,
  ] as const;

  it("a role with no grants has none of the Phase 7 permissions", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = { role };

    for (const key of PHASE7_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(false);
    }
    await expect(assertPermission(user, PERMISSIONS.MARKETING_AI_ASSISTANT_USE)).rejects.toThrow(AuthorizationError);
    await expect(assertPermission(user, PERMISSIONS.MARKETING_CAMPAIGNS_APPROVE)).rejects.toThrow(AuthorizationError);
  });

  it("a role granted only marketing:campaigns_create cannot approve or launch", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.MARKETING_CAMPAIGNS_CREATE } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_CAMPAIGNS_CREATE)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_CAMPAIGNS_APPROVE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_CAMPAIGNS_LAUNCH)).resolves.toBe(false);
  });

  it("a role granted only marketing:content_create cannot approve content", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.MARKETING_CONTENT_CREATE } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_CONTENT_CREATE)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_CONTENT_APPROVE)).resolves.toBe(false);
  });

  it("a role granted only marketing:view cannot use the AI assistant or manage automation", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.MARKETING_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_AI_ASSISTANT_USE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.MARKETING_AUTOMATION_MANAGE)).resolves.toBe(false);
  });

  it("OWNER always has every Phase 7 permission regardless of grants", async () => {
    const owner = { role: { id: "irrelevant-for-owner", name: "OWNER" } };
    for (const key of PHASE7_PERMISSIONS) {
      await expect(userHasPermission(owner, key)).resolves.toBe(true);
    }
  });

  it("ADMIN (seeded with every current permission) has every Phase 7 permission", async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = { role: adminRole };
    for (const key of PHASE7_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(true);
    }
  });
});

describe("Authorization — Phase 8 business intelligence permissions (Test 25)", () => {
  const PHASE8_PERMISSIONS = [
    PERMISSIONS.BI_DASHBOARD_VIEW,
    PERMISSIONS.BI_SALES_VIEW,
    PERMISSIONS.BI_PROFIT_VIEW,
    PERMISSIONS.BI_INVENTORY_VIEW,
    PERMISSIONS.BI_GOLD_VIEW,
    PERMISSIONS.BI_CUSTOMER_VIEW,
    PERMISSIONS.BI_KARIGAR_VIEW,
    PERMISSIONS.BI_SUPPLIER_VIEW,
    PERMISSIONS.BI_CASH_VIEW,
    PERMISSIONS.BI_MARKETING_VIEW,
    PERMISSIONS.BI_FORECASTING_VIEW,
    PERMISSIONS.BI_ALERTS_VIEW,
    PERMISSIONS.BI_ALERTS_MANAGE,
    PERMISSIONS.BI_REPORTS_VIEW,
    PERMISSIONS.BI_REPORTS_EXPORT,
    PERMISSIONS.BI_BRANCH_MANAGE,
    PERMISSIONS.BI_SETTINGS_MANAGE,
  ] as const;

  it("a role with no grants has none of the Phase 8 permissions", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const user = { role };

    for (const key of PHASE8_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(false);
    }
    await expect(assertPermission(user, PERMISSIONS.BI_DASHBOARD_VIEW)).rejects.toThrow(AuthorizationError);
    await expect(assertPermission(user, PERMISSIONS.BI_ALERTS_MANAGE)).rejects.toThrow(AuthorizationError);
  });

  it("a role granted only bi:dashboard_view cannot manage alerts or branches", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.BI_DASHBOARD_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.BI_DASHBOARD_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.BI_ALERTS_MANAGE)).resolves.toBe(false);
    await expect(userHasPermission(user, PERMISSIONS.BI_BRANCH_MANAGE)).resolves.toBe(false);
  });

  it("a role granted only bi:alerts_view cannot acknowledge/resolve/dismiss (bi:alerts_manage)", async () => {
    const role = await getOrCreateRoleWithNoPermissions();
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.BI_ALERTS_VIEW } });
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

    const user = { role };
    await expect(userHasPermission(user, PERMISSIONS.BI_ALERTS_VIEW)).resolves.toBe(true);
    await expect(userHasPermission(user, PERMISSIONS.BI_ALERTS_MANAGE)).resolves.toBe(false);
  });

  it("OWNER always has every Phase 8 permission regardless of grants", async () => {
    const owner = { role: { id: "irrelevant-for-owner", name: "OWNER" } };
    for (const key of PHASE8_PERMISSIONS) {
      await expect(userHasPermission(owner, key)).resolves.toBe(true);
    }
  });

  it("ADMIN (seeded with every current permission) has every Phase 8 permission", async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const user = { role: adminRole };
    for (const key of PHASE8_PERMISSIONS) {
      await expect(userHasPermission(user, key)).resolves.toBe(true);
    }
  });
});
