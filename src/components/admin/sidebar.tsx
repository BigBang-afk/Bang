"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Gem, Layers, FolderTree, Coins, History, MessageSquare, Sparkles,
  Mail, Star, GalleryHorizontal, FileText, Image as ImageIcon, Settings, Users,
  ScrollText, DatabaseBackup, LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/login/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Gem },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/gold-rates", label: "Gold Rates", icon: Coins },
  { href: "/admin/gold-rates/history", label: "Gold Rate History", icon: History },
  { href: "/admin/inquiries", label: "Customer Inquiries", icon: MessageSquare },
  { href: "/admin/custom-orders", label: "Custom Orders", icon: Sparkles },
  { href: "/admin/contact-messages", label: "Contact Messages", icon: Mail },
  { href: "/admin/testimonials", label: "Testimonials", icon: Star },
  { href: "/admin/banners", label: "Banners", icon: GalleryHorizontal },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/settings", label: "Website Settings", icon: Settings },
  { href: "/admin/users", label: "Users & Roles", icon: Users },
  { href: "/admin/activity-logs", label: "Activity Logs", icon: ScrollText },
  { href: "/admin/backup", label: "Backup & Export", icon: DatabaseBackup },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {NAV.map((item) => {
        const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
              active ? "bg-gold/15 text-gold-dark font-medium" : "text-ivory/70 hover:bg-white/5 hover:text-ivory"
            )}
          >
            <Icon size={17} strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({ adminName, adminRole }: { adminName: string; adminRole: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 bg-charcoal px-4 py-3 lg:hidden">
        <span className="font-serif text-lg text-ivory">Zarghoon Admin</span>
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-sm p-2 text-ivory hover:bg-white/10"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={cn(
          "z-40 w-72 shrink-0 flex-col bg-charcoal lg:sticky lg:top-0 lg:flex lg:h-screen",
          mobileOpen ? "fixed inset-0 flex" : "hidden"
        )}
      >
        <div className="hidden border-b border-white/10 px-6 py-5 lg:block">
          <p className="font-serif text-xl text-ivory">Zarghoon Jewellers</p>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Admin Panel</p>
        </div>

        <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />

        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm text-ivory">{adminName}</p>
          <p className="mb-3 text-xs capitalize text-ivory/50">{adminRole.replace("_", " ")}</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-ivory/70 transition-colors hover:bg-white/5 hover:text-ivory"
            >
              <LogOut size={16} /> Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
