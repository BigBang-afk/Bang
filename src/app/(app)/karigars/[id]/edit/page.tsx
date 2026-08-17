import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getKarigarById } from "@/services/karigar.service";
import { EditKarigarForm } from "@/components/karigars/edit-karigar-form";

export const metadata = { title: "Edit Karigar | Zarghoon Jewellers" };

export default async function EditKarigarPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.KARIGARS_MANAGE);
  const { id } = await params;

  const karigar = await getKarigarById(id);
  if (!karigar) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Edit Karigar</h1>
        <p className="text-sm text-muted-foreground">{karigar.karigarCode}</p>
      </div>
      <EditKarigarForm karigar={karigar} />
    </div>
  );
}
