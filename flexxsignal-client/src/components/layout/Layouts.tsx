import { Outlet } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { AppSidebar, MobileNav } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-950">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

export function AppLayout({ mode = "app" }: { mode?: "app" | "admin" }) {
  return (
    <div className="min-h-screen flex bg-navy-950">
      <AppSidebar mode={mode} />
      <div className="flex-1 min-w-0">
        <AppHeader />
        <main className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav mode={mode} />
    </div>
  );
}
