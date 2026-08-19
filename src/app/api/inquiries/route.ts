import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { orderInquirySchema } from "@/lib/validation";
import { jsonError, jsonOk, handleZodError, generateOrderNumber } from "@/lib/api-helpers";
import { getCustomerSession } from "@/lib/auth-customer";
import { getCurrentGoldRateRecord } from "@/lib/gold";
import { calculatePriceBreakdown } from "@/lib/gold";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`inquiry:${ip}`, 20, 60 * 60);
  if (!limited.allowed) return jsonError("Too many requests. Please try again later.", 429);

  try {
    const body = await request.json();
    const data = orderInquirySchema.parse(body);
    const session = await getCustomerSession();

    if (!session && (!data.guestName || !data.guestMobile)) {
      return jsonError("Name and mobile number are required for a guest inquiry.", 422);
    }

    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const useExtras = settings?.pricingUsesExtras ?? false;
    const precision = settings?.decimalPrecision ?? 2;

    const itemsData = [];
    for (const item of data.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return jsonError(`Product not found.`, 404);

      const rateRecord = await getCurrentGoldRateRecord(product.purity);
      if (!rateRecord) {
        return jsonError(`No current ${product.purity} gold rate is set. Please contact the store.`, 409);
      }

      const breakdown = calculatePriceBreakdown({
        grossWeight: Number(product.grossWeight),
        ratePerGram: Number(rateRecord.ratePerGram),
        makingCharges: Number(product.makingCharges),
        stoneCharges: Number(product.stoneCharges),
        otherCharges: Number(product.otherCharges),
        discount: Number(product.discount),
        taxPercent: Number(product.taxPercent),
        useExtras,
        precision,
      });

      itemsData.push({
        productId: product.id,
        productNameAtOrder: product.name,
        quantity: item.quantity,
        purityAtOrder: product.purity,
        grossWeightAtOrder: product.grossWeight,
        goldRateId: rateRecord.id,
        goldRatePerGramAtOrder: rateRecord.ratePerGram,
        makingChargesAtOrder: breakdown.makingCharges,
        stoneChargesAtOrder: breakdown.stoneCharges,
        otherChargesAtOrder: breakdown.otherCharges,
        discountAtOrder: breakdown.discount,
        taxAtOrder: breakdown.taxAmount,
        finalPriceAtOrder: breakdown.finalPrice,
      });

      await prisma.product
        .update({ where: { id: product.id }, data: { inquiryCount: { increment: 1 } } })
        .catch(() => {});
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: session?.customerId ?? null,
        guestName: session ? null : data.guestName,
        guestMobile: session ? null : data.guestMobile,
        notes: data.notes,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    return jsonOk({ order }, 201);
  } catch (err) {
    if (err instanceof ZodError) return handleZodError(err);
    console.error("inquiry error", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
