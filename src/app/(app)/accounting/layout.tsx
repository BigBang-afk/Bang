import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SubNavTabs } from "@/components/layout/sub-nav-tabs";
import { ACCOUNTING_SUB_NAV } from "@/config/nav";

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.ACCOUNTING_REPORTS_VIEW);

  return (
    <div className="flex flex-1 flex-col">
      <SubNavTabs items={ACCOUNTING_SUB_NAV} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
