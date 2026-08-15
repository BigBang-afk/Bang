import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={session.user.role === "ADMIN"} />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
