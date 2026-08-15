import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { setUserRole, setUserStatus, deleteUser } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { Trash2 } from "lucide-react";

export default async function AdminUsersPage() {
  const session = await auth();
  const admin = session!.user;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { watchlist: true } } },
  });

  return (
    <>
      <Topbar
        title="User Management"
        name={admin.name ?? "Admin"}
        email={admin.email ?? ""}
        role={admin.role}
        avatarColor={admin.avatarColor}
      />

      <main className="flex-1 p-6">
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border-subtle bg-surface/50 text-xs text-foreground-muted">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Watchlist</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-[#05070d]"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">
                          {u.name} {u.id === admin.id && <span className="text-xs text-foreground-muted">(you)</span>}
                        </p>
                        <p className="text-xs text-foreground-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        u.role === "ADMIN"
                          ? "bg-brand-violet/10 text-brand-violet"
                          : "bg-surface text-foreground-muted"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        u.status === "ACTIVE"
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-foreground-muted">
                    {u.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-foreground-muted">{u._count.watchlist}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <form action={setUserRole}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={u.role === "ADMIN" ? "USER" : "ADMIN"}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-surface cursor-pointer"
                        >
                          {u.role === "ADMIN" ? "Demote" : "Promote"}
                        </button>
                      </form>

                      {u.id !== admin.id && (
                        <form action={setUserStatus}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-surface cursor-pointer"
                          >
                            {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </form>
                      )}

                      {u.id !== admin.id && (
                        <form action={deleteUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <ConfirmSubmitButton
                            confirmMessage={`Delete ${u.name}? This cannot be undone.`}
                            className="rounded-lg border border-danger/30 p-1.5 text-danger hover:bg-danger/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
