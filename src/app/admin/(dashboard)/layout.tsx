import { getAdminSession } from "@/lib/auth-admin";
import { Sidebar } from "@/components/admin/Sidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default async function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  const session = await getAdminSession();

  return (
    <div className="flex min-h-screen bg-cream-dark/40">
      <aside className="hidden w-64 shrink-0 bg-brown lg:block">
        <div className="fixed h-screen w-64">
          <Sidebar />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar adminName={session?.name ?? "Admin"} />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
