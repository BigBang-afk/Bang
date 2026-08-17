import "server-only";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit.service";
import { userHasPermission, type CurrentUser } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getNotificationProvider } from "@/services/notification/mock-notification-provider";
import type { NotificationKind } from "@/services/notification/notification-provider";

/**
 * Per-user owner-notification preferences and dispatch — see
 * AUTOMATED-REPORTS.md "Owner notification". Stored as a JSON
 * SystemSetting row per user (the same "settings as data" pattern every
 * prior phase uses), rather than a new table, since this is a single
 * small JSON blob per user with no query need beyond "read this one
 * user's preferences."
 */

export type NotificationPreferences = {
  dailyReport: boolean;
  criticalAlert: boolean;
  cashShortage: boolean;
  goldDiscrepancy: boolean;
  majorExpense: boolean;
  salesDrop: boolean;
  inventoryAlert: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  dailyReport: true,
  criticalAlert: true,
  cashShortage: true,
  goldDiscrepancy: true,
  majorExpense: true,
  salesDrop: true,
  inventoryAlert: true,
};

const KIND_TO_PREFERENCE_KEY: Record<NotificationKind, keyof NotificationPreferences> = {
  DAILY_REPORT: "dailyReport",
  CRITICAL_ALERT: "criticalAlert",
  CASH_SHORTAGE: "cashShortage",
  GOLD_DISCREPANCY: "goldDiscrepancy",
  MAJOR_EXPENSE: "majorExpense",
  SALES_DROP: "salesDrop",
  INVENTORY_ALERT: "inventoryAlert",
};

function preferenceSettingKey(userId: string): string {
  return `bi.notification_prefs.${userId}`;
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await prisma.systemSetting.findUnique({ where: { key: preferenceSettingKey(userId) } });
  if (!row) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function setNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
  const key = preferenceSettingKey(userId);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(preferences), updatedById: userId },
    create: { key, value: JSON.stringify(preferences), updatedById: userId },
  });
}

/**
 * Sends a notification only if the recipient is (a) still permitted to
 * see BI data at all and (b) has this specific kind switched on — never
 * bypasses either check. Returns false (never throws) when suppressed by
 * preference/permission, since "the user opted out" is not an error.
 */
export async function dispatchOwnerNotification(
  recipient: Pick<CurrentUser, "id" | "email" | "role">,
  kind: NotificationKind,
  subject: string,
  body: string,
): Promise<boolean> {
  const allowed = await userHasPermission(recipient, PERMISSIONS.BI_DASHBOARD_VIEW);
  if (!allowed) return false;

  const preferences = await getNotificationPreferences(recipient.id);
  if (!preferences[KIND_TO_PREFERENCE_KEY[kind]]) return false;

  const provider = getNotificationProvider();
  const result = await provider.sendNotification({ to: recipient.email, channel: "EMAIL", kind, subject, body });
  return result.status === "SENT";
}

export async function recordReportGeneratedNotificationAudit(userId: string, kind: NotificationKind, sent: boolean): Promise<void> {
  await writeAuditLog({ userId, action: "REPORT_GENERATED", entity: "Notification", metadata: { kind, sent } });
}
