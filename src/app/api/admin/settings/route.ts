import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";

export async function GET() {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return jsonOk({ settings });
}

const updateSchema = z.object({
  businessName: z.string().trim().min(1).max(150).optional(),
  logoUrl: z.string().optional().nullable(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().email().optional(),
  openingHours: z.string().trim().max(200).optional(),

  decimalPrecision: z.coerce.number().int().min(0).max(4).optional(),
  pricingUsesExtras: z.boolean().optional(),

  currency: z.string().trim().max(10).optional(),
  weightUnit: z.string().trim().max(10).optional(),
  defaultPurity: z.enum(["K24", "K21", "K18"]).optional(),

  registrationEnabled: z.boolean().optional(),
  birthdayRemindersEnabled: z.boolean().optional(),
  requireMarketingConsent: z.boolean().optional(),

  facebookUrl: z.string().trim().max(300).optional().or(z.literal("")),
  instagramUrl: z.string().trim().max(300).optional().or(z.literal("")),
  whatsappUrl: z.string().trim().max(300).optional().or(z.literal("")),
  youtubeUrl: z.string().trim().max(300).optional().or(z.literal("")),
  tiktokUrl: z.string().trim().max(300).optional().or(z.literal("")),

  notifyBirthdayReminders: z.boolean().optional(),
  notifyNewCustomer: z.boolean().optional(),
  notifyNewInquiry: z.boolean().optional(),
  notifyGoldRateUpdate: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const settings = await prisma.settings.update({ where: { id: "singleton" }, data });

    await logAdminActivity({
      adminId: session.adminId,
      action: "SETTINGS_CHANGED",
      description: "Updated store settings",
      entityType: "Settings",
      entityId: "singleton",
      request,
    });

    return jsonOk({ settings });
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("update settings error", err);
    return jsonError("Something went wrong.", 500);
  }
}
