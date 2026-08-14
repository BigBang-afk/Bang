import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppTopbar } from "@/components/shared/app-topbar";
import { requireUser } from "@/lib/auth/session";
import { dashboardNav } from "@/lib/config/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar items={dashboardNav} homeHref="/dashboard" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          profile={profile}
          navItems={dashboardNav}
          homeHref="/dashboard"
          settingsHref="/dashboard/settings"
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
