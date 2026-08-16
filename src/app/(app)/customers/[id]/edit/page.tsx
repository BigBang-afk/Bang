import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getCustomerProfile } from "@/services/customer.service";
import { EditCustomerForm } from "@/components/customers/edit-customer-form";

export const metadata = { title: "Edit Customer | Zarghoon Jewellers" };

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const { id } = await params;

  const profile = await getCustomerProfile(id);
  if (!profile) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Edit Customer</h1>
        <p className="text-sm text-muted-foreground">{profile.name}</p>
      </div>

      <EditCustomerForm
        initial={{
          id: profile.id,
          firstName: profile.firstName ?? profile.name,
          lastName: profile.lastName ?? "",
          phone: profile.phone,
          secondaryPhone: profile.secondaryPhone ?? "",
          email: profile.email ?? "",
          address: profile.address ?? "",
          city: profile.city ?? "",
          dateOfBirth: toDateInputValue(profile.dateOfBirth),
          anniversaryDate: toDateInputValue(profile.anniversaryDate),
          preferredLanguage: profile.preferredLanguage ?? "",
          notes: profile.notes ?? "",
          customerType: profile.customerType,
          status: profile.status,
        }}
      />
    </div>
  );
}
