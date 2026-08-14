import Link from "next/link";
import { LogOut, Settings, Shield } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNavSheet } from "@/components/shared/mobile-nav-sheet";
import { signOutAction } from "@/lib/actions/auth";
import type { NavItem } from "@/lib/config/nav";
import type { SessionProfile } from "@/lib/auth/session";

export function AppTopbar({
  profile,
  navItems,
  homeHref,
  settingsHref,
}: {
  profile: SessionProfile;
  navItems: NavItem[];
  homeHref: string;
  settingsHref: string;
}) {
  const displayName = profile.display_name || profile.full_name || "Trader";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNavSheet items={navItems} homeHref={homeHref} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-8">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <span className="text-xs font-normal text-muted-foreground capitalize">
              {profile.role} plan access
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href={settingsHref} />}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          {(profile.role === "admin" || profile.role === "superadmin") && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <Shield className="size-4" />
              Admin dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem
              variant="destructive"
              render={<button type="submit" className="w-full" />}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
