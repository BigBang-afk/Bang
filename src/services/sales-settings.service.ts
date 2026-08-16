import "server-only";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { SETTINGS_KEYS, discountLimitKey } from "@/lib/settings-keys";
import { OWNER_ROLE_NAME } from "@/lib/auth/permissions";

const DEFAULT_DISCOUNT_LIMIT = 0; // safe default: no discount until an owner configures one.

/**
 * Maximum discount percentage a role may apply at checkout. OWNER is never
 * capped — it bypasses this the same way it bypasses every other
 * permission check in the app (see src/lib/auth/dal.ts). Every other role
 * reads its limit from SystemSetting, falling back to 0% (no discount) if
 * never configured, never to "unlimited" — a missing config must never
 * silently grant more discount than intended.
 */
export async function getMaxDiscountPercentForRole(roleName: string): Promise<Decimal> {
  if (roleName === OWNER_ROLE_NAME) return new Decimal(100);

  const row = await prisma.systemSetting.findUnique({
    where: { key: discountLimitKey(roleName) },
  });
  if (!row) return new Decimal(DEFAULT_DISCOUNT_LIMIT);

  try {
    const value = new Decimal(row.value);
    return value.isFinite() && value.gte(0) ? value : new Decimal(DEFAULT_DISCOUNT_LIMIT);
  } catch {
    return new Decimal(DEFAULT_DISCOUNT_LIMIT);
  }
}

export async function setMaxDiscountPercentForRole(
  roleName: string,
  maxPercent: number,
  updatedById: string,
): Promise<void> {
  const key = discountLimitKey(roleName);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: String(maxPercent), updatedById },
    create: {
      key,
      value: String(maxPercent),
      updatedById,
      description: `Maximum discount percentage a ${roleName} can apply at checkout.`,
    },
  });
  await writeAuditLog({
    userId: updatedById,
    action: "SETTINGS_CHANGED",
    entity: "SystemSetting",
    entityId: key,
    metadata: { key, value: maxPercent },
  });
}

export type TaxSettings = { enabled: boolean; percent: Decimal };

/**
 * Tax is disabled by default and the percentage is never hardcoded — both
 * come from SystemSetting so an owner configures them per the business's
 * own tax obligations. See SALES.md "Tax".
 */
export async function getTaxSettings(): Promise<TaxSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [SETTINGS_KEYS.TAX_ENABLED, SETTINGS_KEYS.TAX_PERCENT] } },
  });
  const enabledRow = rows.find((row) => row.key === SETTINGS_KEYS.TAX_ENABLED);
  const percentRow = rows.find((row) => row.key === SETTINGS_KEYS.TAX_PERCENT);

  const enabled = enabledRow?.value === "true";
  let percent = new Decimal(0);
  if (enabled && percentRow) {
    try {
      const parsed = new Decimal(percentRow.value);
      if (parsed.isFinite() && parsed.gte(0) && parsed.lte(100)) percent = parsed;
    } catch {
      percent = new Decimal(0);
    }
  }

  return { enabled, percent };
}

export async function setTaxSettings(
  input: { enabled: boolean; percent: number },
  updatedById: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: SETTINGS_KEYS.TAX_ENABLED },
      update: { value: String(input.enabled), updatedById },
      create: { key: SETTINGS_KEYS.TAX_ENABLED, value: String(input.enabled), updatedById },
    }),
    prisma.systemSetting.upsert({
      where: { key: SETTINGS_KEYS.TAX_PERCENT },
      update: { value: String(input.percent), updatedById },
      create: { key: SETTINGS_KEYS.TAX_PERCENT, value: String(input.percent), updatedById },
    }),
  ]);
  await writeAuditLog({
    userId: updatedById,
    action: "SETTINGS_CHANGED",
    entity: "SystemSetting",
    entityId: SETTINGS_KEYS.TAX_ENABLED,
    metadata: input,
  });
}

export type InvoiceBusinessInfo = {
  name: string;
  currency: string;
  address: string;
  phone: string;
  footerText: string;
};

export async function getInvoiceBusinessInfo(): Promise<InvoiceBusinessInfo> {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          SETTINGS_KEYS.BUSINESS_NAME,
          SETTINGS_KEYS.BUSINESS_CURRENCY,
          SETTINGS_KEYS.BUSINESS_ADDRESS,
          SETTINGS_KEYS.BUSINESS_PHONE,
          SETTINGS_KEYS.INVOICE_FOOTER_TEXT,
        ],
      },
    },
  });
  const value = (key: string, fallback: string) => rows.find((r) => r.key === key)?.value ?? fallback;

  return {
    name: value(SETTINGS_KEYS.BUSINESS_NAME, "Zarghoon Jewellers"),
    currency: value(SETTINGS_KEYS.BUSINESS_CURRENCY, "PKR"),
    address: value(SETTINGS_KEYS.BUSINESS_ADDRESS, ""),
    phone: value(SETTINGS_KEYS.BUSINESS_PHONE, ""),
    footerText: value(SETTINGS_KEYS.INVOICE_FOOTER_TEXT, "Thank you for shopping with Zarghoon Jewellers."),
  };
}
