import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppTopbar } from "@/components/shared/app-topbar";
import { requireAdmin } from "@/lib/auth/session";
import { adminNav } from "@/lib/config/nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Authorization is re-checked here — not just hidden via the sidebar —
  // and enforced again at the data layer by RLS (public.is_admin()) on
  // every table read, so this is defense in depth, not the only gate.
  const profile = await requireAdmin();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar items={adminNav} homeHref="/admin" badge="Admin" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          profile={profile}
          navItems={adminNav}
          homeHref="/admin"
          settingsHref="/admin/settings"
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
