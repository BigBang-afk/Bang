import "server-only";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function logAdminActivity(params: {
  adminId: string | null;
  action: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  request?: NextRequest;
}) {
  const { request } = params;
  const forwardedFor = request?.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
  const userAgent = request?.headers.get("user-agent") ?? null;

  await prisma.adminActivityLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
      ipAddress,
      userAgent,
    },
  });
}
