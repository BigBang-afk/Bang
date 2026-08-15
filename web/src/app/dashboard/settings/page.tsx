import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { updateProfile } from "./actions";

export default async function SettingsPage() {
  const session = await auth();
  const user = session!.user;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  return (
    <>
      <Topbar
        title="Settings"
        name={user.name ?? "Trader"}
        email={user.email ?? ""}
        role={user.role}
        avatarColor={user.avatarColor}
      />

      <main className="flex-1 p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-semibold">Profile</h3>
            <form action={updateProfile} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground-muted">Full name</label>
                <input
                  name="name"
                  defaultValue={dbUser?.name}
                  className="w-full rounded-xl bg-surface border border-border-subtle px-4 py-2.5 text-sm outline-none focus:border-brand-green/60"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground-muted">Email</label>
                <input
                  disabled
                  value={dbUser?.email}
                  className="w-full rounded-xl bg-surface/50 border border-border-subtle px-4 py-2.5 text-sm text-foreground-muted outline-none"
                />
              </div>
              <button
                type="submit"
                className="btn-primary self-start rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer"
              >
                Save changes
              </button>
            </form>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-semibold">Account</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Role</span>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium">
                  {dbUser?.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Member since</span>
                <span>{dbUser?.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
