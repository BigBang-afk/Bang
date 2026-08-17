import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SubNavTabs } from "@/components/layout/sub-nav-tabs";
import { CUSTOMERS_SUB_NAV } from "@/config/nav";

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);

  return (
    <div className="flex flex-1 flex-col">
      <SubNavTabs items={CUSTOMERS_SUB_NAV} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
