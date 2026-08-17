import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SubNavTabs } from "@/components/layout/sub-nav-tabs";
import { PURCHASES_SUB_NAV } from "@/config/nav";

export default async function PurchasesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.PURCHASES_VIEW);

  return (
    <div className="flex flex-1 flex-col">
      <SubNavTabs items={PURCHASES_SUB_NAV} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
