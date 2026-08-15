import { UserMenu } from "@/components/site/user-menu";
import { Bell, Search } from "lucide-react";

export function Topbar({
  title,
  name,
  email,
  role,
  avatarColor,
}: {
  title: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-background/80 px-6 backdrop-blur-lg">
      <h1 className="font-display text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground-muted sm:flex">
          <Search className="h-4 w-4" />
          <span>Search symbols...</span>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle bg-surface text-foreground-muted hover:text-foreground cursor-pointer">
          <Bell className="h-4 w-4" />
        </button>
        <UserMenu name={name} email={email} role={role} avatarColor={avatarColor} />
      </div>
    </header>
  );
}
