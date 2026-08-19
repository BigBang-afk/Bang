import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isNextResponse, jsonError, jsonOk, requireAdmin } from "@/lib/api-helpers";
import { getPricingContext, priceProductWithRates } from "@/lib/gold";

const schema = z.object({
  purity: z.enum(["K24", "K21", "K18"]),
  grossWeight: z.coerce.number().nonnegative(),
  makingCharges: z.coerce.number().nonnegative().optional().default(0),
  stoneCharges: z.coerce.number().nonnegative().optional().default(0),
  otherCharges: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
  taxPercent: z.coerce.number().min(0).max(100).optional().default(0),
});

/**
 * Live "preview" price for the add/edit product form. The calculation
 * itself always happens here on the server (never in the browser) — the
 * form only ever displays what this endpoint returns.
 */
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isNextResponse(session)) return session;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input.", 422);

  const ctx = await getPricingContext();
  const priced = priceProductWithRates(parsed.data, ctx.rates, ctx.useExtras, ctx.precision);
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  return jsonOk({ price: priced, pricingUsesExtras: settings?.pricingUsesExtras ?? false });
}
