"use server";

import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { getDailyReport, dailyReportToCsv, auditReportGenerated } from "@/services/bi-report.service";
import { getBusinessInsightsAudited, type BusinessInsight } from "@/services/bi-insight.service";
import { getSalesForecast, type ForecastPeriodDays } from "@/services/forecast.service";
import { writeAuditLog } from "@/services/audit.service";
import { getTodayBusinessDate } from "@/lib/business-date";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

/** Real CSV, built from the same data the Daily Report page shows — no placeholder download. Matches the shared ExportCsvButton contract (ActionResult<string>). */
export async function exportDailyReportCsvAction(): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.BI_REPORTS_EXPORT);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const businessDate = getTodayBusinessDate();
  const report = await getDailyReport(businessDate);
  const csv = dailyReportToCsv(report);
  await writeAuditLog({ userId: user.id, action: "REPORT_EXPORTED", entity: "BiReport", metadata: { reportType: "DAILY" } });
  await auditReportGenerated(user.id, "DAILY");
  return { ok: true, data: csv };
}

export async function getBusinessInsightsAction(): Promise<ActionResult<{ insights: BusinessInsight[] }>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.BI_DASHBOARD_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const insights = await getBusinessInsightsAudited(user.id);
  return { ok: true, data: { insights } };
}

export async function getSalesForecastAction(periodDays: ForecastPeriodDays): Promise<ActionResult<Awaited<ReturnType<typeof getSalesForecast>>>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.BI_FORECASTING_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const forecast = await getSalesForecast(periodDays);
  await writeAuditLog({ userId: user.id, action: "FORECAST_GENERATED", entity: "SalesForecast", metadata: { periodDays, confidence: forecast.confidence } });
  return { ok: true, data: forecast };
}
