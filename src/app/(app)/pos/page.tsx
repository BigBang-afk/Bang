import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PosScreen } from "@/components/pos/pos-screen";

export const metadata = { title: "New Sale | Zarghoon Jewellers" };

export default async function NewSalePage() {
  await requirePermission(PERMISSIONS.SALES_CREATE);

  return <PosScreen />;
}
