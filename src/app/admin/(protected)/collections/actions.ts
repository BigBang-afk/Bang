"use server";

import {
  createTaxonomyAction, updateTaxonomyAction, deleteTaxonomyAction, toggleTaxonomyActiveAction, type ActionState,
} from "@/lib/actions/taxonomy";

export async function createCollectionAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  return createTaxonomyAction("collections", prev, formData);
}

export async function updateCollectionAction(
  id: string,
  existingImageUrl: string | null,
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return updateTaxonomyAction("collections", id, existingImageUrl, prev, formData);
}

export async function deleteCollectionAction(id: string) {
  return deleteTaxonomyAction("collections", id);
}

export async function toggleCollectionActiveAction(id: string, isActive: boolean) {
  return toggleTaxonomyActiveAction("collections", id, isActive);
}
