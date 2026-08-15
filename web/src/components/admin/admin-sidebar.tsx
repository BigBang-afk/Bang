"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, ArrowLeft, ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-background-elevated lg:flex">
      <div className="flex h-16 items-center border-b border-border-subtle px-6">
        <Link href="/">
          <Logo />
        </Link>
      </div>

      <div className="flex items-center gap-2 px-6 pt-4 text-xs font-semibold uppercase tracking-wider text-brand-violet">
        <ShieldCheck className="h-3.5 w-3.5" />
        Admin
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-violet/10 text-brand-violet"
                  : "text-foreground-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 h-px bg-border-subtle" />
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          Back to dashboard
        </Link>
      </nav>
    </aside>
  );
}
