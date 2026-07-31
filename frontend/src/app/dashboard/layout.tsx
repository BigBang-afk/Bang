import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
