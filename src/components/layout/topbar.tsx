import Link from "next/link";
import { Bell, CircleCheck, CircleAlert } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { CurrentUser } from "@/lib/auth/dal";

export function Topbar({
  user,
  hasTodayRates,
  businessName,
}: {
  user: CurrentUser;
  hasTodayRates: boolean;
  businessName: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6 print:hidden">
      <MobileNav />

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
          {businessName}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(new Date())}</p>
      </div>

      <Link href="/settings/gold-rates/history" className="hidden sm:block">
        {hasTodayRates ? (
          <Badge variant="success">
            <CircleCheck className="size-3" />
            Today&apos;s rate set
          </Badge>
        ) : (
          <Badge variant="warning">
            <CircleAlert className="size-3" />
            Rate not set
          </Badge>
        )}
      </Link>

      <button
        type="button"
        title="Notifications — coming in next phase"
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Bell className="size-4.5" />
      </button>

      <UserMenu name={user.name} email={user.email} roleName={user.role.name} />
    </header>
  );
}
