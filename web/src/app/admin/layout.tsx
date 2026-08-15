import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
