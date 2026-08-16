"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategoryAction, type CategoryFormState } from "@/lib/actions/category.actions";

export function CreateCategoryForm() {
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(
    createCategoryAction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Category created.");
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      key={state?.success ? "reset" : "form"}
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="name">Category Name</Label>
        <Input id="name" name="name" required aria-invalid={!!state?.fieldErrors?.name} />
        {state?.fieldErrors?.name && <p className="text-xs text-danger">{state.fieldErrors.name}</p>}
      </div>
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="description">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="description" name="description" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add Category"}
      </Button>
    </form>
  );
}
