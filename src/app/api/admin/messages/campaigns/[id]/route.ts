import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, requireAdmin } from "@/lib/api-helpers";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/messages/campaigns/[id]">) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await ctx.params;
  const campaign = await prisma.messageCampaign.findUnique({
    where: { id },
    include: {
      recipients: { include: { customer: { select: { fullName: true, mobile: true } } }, orderBy: { createdAt: "asc" } },
      template: true,
      group: true,
      createdByAdmin: { select: { name: true } },
    },
  });
  if (!campaign) return jsonError("Campaign not found.", 404);
  return jsonOk({ campaign });
}
