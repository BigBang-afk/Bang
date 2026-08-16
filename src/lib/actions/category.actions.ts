"use server";

import { revalidatePath } from "next/cache";
import { requireUser, assertPermission } from "@/lib/auth/dal";
import { PERMISSIONS, AuthorizationError } from "@/lib/auth/permissions";
import { createCategorySchema } from "@/lib/validation/inventory";
import { createCategory } from "@/services/product-category.service";
import { Prisma } from "@/generated/prisma/client";

export type CategoryFormState =
  | { error?: string; fieldErrors?: Record<string, string>; success?: boolean }
  | undefined;

export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await requireUser();
  try {
    await assertPermission(user, PERMISSIONS.CATEGORY_MANAGE);
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: "Enter a valid category name.", fieldErrors: { name: "Required, max 120 characters." } };
  }

  try {
    await createCategory(parsed.data, user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A category with this name already exists.", fieldErrors: { name: "Already exists." } };
    }
    throw error;
  }

  revalidatePath("/inventory/categories");
  revalidatePath("/inventory/add");
  return { success: true };
}
