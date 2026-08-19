import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { campaignSchema } from "@/lib/validation";
import { isNextResponse, jsonError, jsonOk, handleZodError, requireAdmin } from "@/lib/api-helpers";
import { logAdminActivity } from "@/lib/activity-log";
import { resolveRecipients } from "@/lib/customer-groups";
import { getMessagingProvider, renderTemplate } from "@/lib/messaging";
import { getCurrentGoldRates } from "@/lib/gold";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // e.g. "FAILED" to view failed sends
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  const where = status ? { status: status as "DRAFT" | "QUEUED" | "SENDING" | "SENT" | "FAILED" | "PARTIAL" } : {};

  const [total, campaigns] = await Promise.all([
    prisma.messageCampaign.count({ where }),
    prisma.messageCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        template: { select: { name: true, type: true } },
        group: { select: { name: true } },
        createdByAdmin: { select: { name: true } },
      },
    }),
  ]);

  return jsonOk({ items: campaigns, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  try {
    const body = await request.json();
    const data = campaignSchema.parse(body);

    const recipients = await resolveRecipients(data.groupKey, data.customerIds);
    if (recipients.length === 0) {
      return jsonError("No eligible recipients found for this audience (they may have opted out of marketing).", 422);
    }

    const [settings, rates] = await Promise.all([
      prisma.settings.findUnique({ where: { id: "singleton" } }),
      getCurrentGoldRates(),
    ]);

    const campaign = await prisma.messageCampaign.create({
      data: {
        name: data.name,
        templateId: data.templateId || null,
        channel: data.channel,
        body: data.body,
        groupId: ["all", "new_customers", "vip", "birthday_customers", "purchased", "inactive", "selected"].includes(
          data.groupKey,
        )
          ? null
          : data.groupKey,
        createdByAdminId: session.adminId,
        status: "SENDING",
        totalRecipients: recipients.length,
      },
    });

    const provider = getMessagingProvider();
    let sentCount = 0;
    let failedCount = 0;

    for (const customer of recipients) {
      const renderedBody = renderTemplate(data.body, {
        customer_name: customer.fullName,
        gold_rate: rates.K21 ? String(rates.K21) : rates.K24 ? String(rates.K24) : "",
        store_name: settings?.businessName ?? "Zarghoon Jewellers",
        phone: settings?.phone ?? "",
        date: new Date().toLocaleDateString(),
      });

      const result = await provider.send(customer.mobile, renderedBody, data.channel);

      await prisma.messageRecipient.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          renderedBody,
          status: result.success ? "SENT" : "FAILED",
          providerMessageId: result.providerMessageId,
          errorMessage: result.error,
          sentAt: result.success ? new Date() : null,
        },
      });

      if (result.success) sentCount += 1;
      else failedCount += 1;
    }

    const finalStatus = sentCount === 0 ? "FAILED" : failedCount === 0 ? "SENT" : "PARTIAL";

    const updated = await prisma.messageCampaign.update({
      where: { id: campaign.id },
      data: { status: finalStatus, sentCount, failedCount, sentAt: new Date() },
    });

    await logAdminActivity({
      adminId: session.adminId,
      action: "MESSAGE_SENT",
      description: `Campaign "${campaign.name}" — ${sentCount} sent, ${failedCount} failed`,
      entityType: "MessageCampaign",
      entityId: campaign.id,
      request,
    });

    return jsonOk({ campaign: updated }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("create campaign error", err);
    return jsonError("Something went wrong.", 500);
  }
}
