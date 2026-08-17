"use server";

import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { z } from "zod";
import { searchCustomers } from "@/services/customer.service";
import { getAiCustomerSummary, type AiCustomerSummary } from "@/services/ai-customer-insight.service";
import { getAiCustomerSegments, type AiSegment } from "@/services/ai-segmentation.service";
import { getBusinessEngagementScore, type BusinessEngagementScore } from "@/services/customer-scoring.service";
import { getRecommendationsForCustomer, type ProductRecommendation } from "@/services/recommendation.service";
import type { ActionResult } from "@/lib/actions/action-result";

async function requirePermissionAction(key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const user = await requireUser();
  await assertPermission(user, key);
  return user;
}

export type CustomerSearchOption = { id: string; customerCode: string; name: string; phone: string };

export async function searchCustomersForInsightsAction(query: string): Promise<ActionResult<CustomerSearchOption[]>> {
  try {
    await requirePermissionAction(PERMISSIONS.CUSTOMERS_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }
  if (!query || query.trim().length < 2) return { ok: true, data: [] };
  const results = await searchCustomers(query);
  return { ok: true, data: results.map((r) => ({ id: r.id, customerCode: r.customerCode, name: r.name, phone: r.phone })) };
}

export type CustomerInsightBundle = {
  summary: AiCustomerSummary;
  segments: AiSegment[];
  score: BusinessEngagementScore;
  recommendations: ProductRecommendation[];
};

const customerIdSchema = z.object({ customerId: z.uuid() });

export async function getCustomerInsightsAction(input: unknown): Promise<ActionResult<CustomerInsightBundle>> {
  let user;
  try {
    user = await requirePermissionAction(PERMISSIONS.CUSTOMERS_VIEW);
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    throw error;
  }

  const parsed = customerIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const [summary, segments, score, recommendations] = await Promise.all([
    getAiCustomerSummary(parsed.data.customerId, user.id),
    getAiCustomerSegments(parsed.data.customerId),
    getBusinessEngagementScore(parsed.data.customerId),
    getRecommendationsForCustomer(parsed.data.customerId),
  ]);

  return { ok: true, data: { summary, segments, score, recommendations } };
}
