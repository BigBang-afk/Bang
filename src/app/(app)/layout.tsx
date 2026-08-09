import { requireAccount } from "@/lib/require-auth";
import { getHeaderData } from "@/lib/header-data";
import { toNumber } from "@/lib/money";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { QuickAddMenu } from "@/components/layout/quick-add-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, account, settings } = await requireAccount();
  const headerData = await getHeaderData(account.id);

  return (
    <div className="flex min-h-screen">
      <Sidebar traderName={user.traderName} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          traderName={user.traderName}
          balance={headerData.balance}
          todayPnlUsd={headerData.todayPnlUsd}
          usdToPkrRate={toNumber(settings.usdToPkrRate)}
          goldPricePerGramPkr={toNumber(settings.goldPricePerGramPkr)}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <QuickAddMenu floating />
    </div>
  );
}
