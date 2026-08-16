import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SubNavTabs } from "@/components/layout/sub-nav-tabs";
import { INVENTORY_SUB_NAV } from "@/config/nav";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);

  return (
    <div className="flex flex-1 flex-col">
      <SubNavTabs items={INVENTORY_SUB_NAV} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
