import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Users, ShieldCheck, UserX, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const session = await auth();
  const admin = session!.user;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalUsers, totalAdmins, suspended, newToday, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <>
      <Topbar
        title="Admin Overview"
        name={admin.name ?? "Admin"}
        email={admin.email ?? ""}
        role={admin.role}
        avatarColor={admin.avatarColor}
      />

      <main className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={String(totalUsers)} icon={Users} />
          <StatCard label="Admins" value={String(totalAdmins)} icon={ShieldCheck} />
          <StatCard label="Suspended accounts" value={String(suspended)} icon={UserX} />
          <StatCard label="New today" value={String(newToday)} icon={UserPlus} />
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground-muted">Recent signups</h3>
            <Link href="/admin/users" className="text-xs font-medium text-brand-green hover:underline">
              View all users
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-border-subtle">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-[#05070d]"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-foreground-muted">{u.email}</p>
                  </div>
                </div>
                <span className="text-xs text-foreground-muted">
                  {u.createdAt.toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
