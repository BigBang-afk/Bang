"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { setGoldRatesSchema } from "@/lib/validation/gold-rate";
import { createTodaysGoldRates, todaysRatesExist } from "@/services/gold-rate.service";

export type SetGoldRatesState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
} | undefined;

export async function setTodaysGoldRates(
  _prevState: SetGoldRatesState,
  formData: FormData,
): Promise<SetGoldRatesState> {
  const user = await requireUser();

  try {
    await assertPermission(user, PERMISSIONS.GOLD_RATE_CREATE);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: error.message };
    }
    throw error;
  }

  const parsed = setGoldRatesSchema.safeParse({
    k24: formData.get("k24"),
    k22: formData.get("k22"),
    k21: formData.get("k21"),
    k18: formData.get("k18"),
    silver: formData.get("silver") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  if (await todaysRatesExist()) {
    return { error: "Today's gold rates have already been set." };
  }

  await createTodaysGoldRates(parsed.data, user.id);

  revalidatePath("/dashboard");
  revalidatePath("/settings/gold-rates");
  revalidatePath("/settings/gold-rates/history");

  return { success: true };
}
