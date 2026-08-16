import "server-only";
import { prisma } from "@/lib/db/prisma";

const DEFAULTS: Record<string, string> = {
  "business.name": "Zarghoon Jewellers",
  "business.currency": "PKR",
};

export async function getSystemSetting(key: string): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSystemSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = rows.find((row) => row.key === key)?.value ?? DEFAULTS[key] ?? "";
  }
  return result;
}
