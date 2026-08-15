import { auth } from "@/auth";
import { Topbar } from "@/components/dashboard/topbar";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";

export default async function WatchlistPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <>
      <Topbar
        title="Watchlist"
        name={user.name ?? "Trader"}
        email={user.email ?? ""}
        role={user.role}
        avatarColor={user.avatarColor}
      />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <WatchlistPanel />
        </div>
      </main>
    </>
  );
}
