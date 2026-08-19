import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-customer";
import { jsonError, jsonOk } from "@/lib/api-helpers";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/wishlist/[productId]">,
) {
  const session = await getCustomerSession();
  if (!session) return jsonError("Please log in to continue.", 401);

  const { productId } = await ctx.params;

  await prisma.wishlist.deleteMany({
    where: { customerId: session.customerId, productId },
  });

  return jsonOk({ success: true });
}
