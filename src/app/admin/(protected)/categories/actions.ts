"use server";

import {
  createTaxonomyAction, updateTaxonomyAction, deleteTaxonomyAction, toggleTaxonomyActiveAction, type ActionState,
} from "@/lib/actions/taxonomy";

export async function createCategoryAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return createTaxonomyAction("categories", prev, formData);
}

export async function updateCategoryAction(
  id: string,
  existingImageUrl: string | null,
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return updateTaxonomyAction("categories", id, existingImageUrl, prev, formData);
}

export async function deleteCategoryAction(id: string) {
  return deleteTaxonomyAction("categories", id);
}

export async function toggleCategoryActiveAction(id: string, isActive: boolean) {
  return toggleTaxonomyActiveAction("categories", id, isActive);
}
