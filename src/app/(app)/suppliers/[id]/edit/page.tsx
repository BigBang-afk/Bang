import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupplierById } from "@/services/supplier.service";
import { EditSupplierForm } from "@/components/suppliers/edit-supplier-form";

export const metadata = { title: "Edit Supplier | Zarghoon Jewellers" };

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const { id } = await params;

  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Edit Supplier</h1>
        <p className="text-sm text-muted-foreground">{supplier.supplierCode}</p>
      </div>
      <EditSupplierForm supplier={supplier} />
    </div>
  );
}
