import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { GoldPurity } from "@/generated/prisma/client";

/**
 * Business preferences — "prefers 21K gold", "usually buys bridal sets".
 * Not sensitive profiling; see CUSTOMER-CRM.md "Customer preferences".
 */

export type CustomerPreferenceInput = {
  preferredCategories?: string[];
  preferredPurity?: GoldPurity | null;
  preferredMetal?: string;
  preferredPriceRangeMin?: number;
  preferredPriceRangeMax?: number;
  preferredContactMethod?: string;
  notes?: string;
};

export async function upsertCustomerPreference(
  customerId: string,
  input: CustomerPreferenceInput,
): Promise<void> {
  await prisma.customerPreference.upsert({
    where: { customerId },
    update: {
      preferredCategories: input.preferredCategories ?? [],
      preferredPurity: input.preferredPurity ?? null,
      preferredMetal: input.preferredMetal || null,
      preferredPriceRangeMin: input.preferredPriceRangeMin ?? null,
      preferredPriceRangeMax: input.preferredPriceRangeMax ?? null,
      preferredContactMethod: input.preferredContactMethod || null,
      notes: input.notes || null,
    },
    create: {
      customerId,
      preferredCategories: input.preferredCategories ?? [],
      preferredPurity: input.preferredPurity ?? null,
      preferredMetal: input.preferredMetal || null,
      preferredPriceRangeMin: input.preferredPriceRangeMin ?? null,
      preferredPriceRangeMax: input.preferredPriceRangeMax ?? null,
      preferredContactMethod: input.preferredContactMethod || null,
      notes: input.notes || null,
    },
  });
}
