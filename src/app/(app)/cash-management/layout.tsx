import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SubNavTabs } from "@/components/layout/sub-nav-tabs";
import { CASH_MANAGEMENT_SUB_NAV } from "@/config/nav";

export default async function CashManagementLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.CASH_VIEW);

  return (
    <div className="flex flex-1 flex-col">
      <SubNavTabs items={CASH_MANAGEMENT_SUB_NAV} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
