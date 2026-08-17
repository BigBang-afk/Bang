import { requireUser, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { todaysRatesExist } from "@/services/gold-rate.service";
import { getSystemSetting } from "@/services/system-setting.service";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { GoldRateGate } from "@/components/gold-rate/gold-rate-gate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [hasTodayRates, canSetGoldRates, businessName] = await Promise.all([
    todaysRatesExist(),
    userHasPermission(user, PERMISSIONS.GOLD_RATE_CREATE),
    getSystemSetting("business.name"),
  ]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} hasTodayRates={hasTodayRates} businessName={businessName} />
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
      <GoldRateGate shouldShow={canSetGoldRates && !hasTodayRates} />
    </div>
  );
}
