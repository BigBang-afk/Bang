import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AddKarigarForm } from "@/components/karigars/add-karigar-form";

export const metadata = { title: "Add Karigar | Zarghoon Jewellers" };

export default async function AddKarigarPage() {
  await requirePermission(PERMISSIONS.KARIGARS_MANAGE);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Add Karigar</h1>
        <p className="text-sm text-muted-foreground">Register a new karigar for job-work tracking.</p>
      </div>
      <AddKarigarForm />
    </div>
  );
}
