"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Gem,
  Tags,
  Coins,
  Users,
  Cake,
  UsersRound,
  Megaphone,
  ClipboardList,
  Images,
  Home,
  FileBarChart,
  MessageSquareText,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Products",
    items: [
      { href: "/admin/products", label: "All Products", icon: Gem },
      { href: "/admin/products/new", label: "Add Product", icon: Gem },
      { href: "/admin/categories", label: "Categories", icon: Tags },
    ],
  },
  {
    title: "Gold Rates",
    items: [{ href: "/admin/gold-rates", label: "Rates & History", icon: Coins }],
  },
  {
    title: "Customers",
    items: [
      { href: "/admin/customers", label: "All Customers", icon: Users },
      { href: "/admin/customers/birthdays", label: "Birthday Reminders", icon: Cake },
      { href: "/admin/customers/groups", label: "Customer Groups", icon: UsersRound },
      { href: "/admin/customers/marketing", label: "Marketing", icon: Megaphone },
    ],
  },
  {
    items: [
      { href: "/admin/orders", label: "Orders / Inquiries", icon: ClipboardList },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/homepage", label: "Homepage", icon: Home },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    title: "Messages",
    items: [
      { href: "/admin/messages/templates", label: "Templates", icon: MessageSquareText },
      { href: "/admin/messages/campaigns", label: "Sent Messages", icon: MessageSquareText },
    ],
  },
  {
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/activity", label: "Admin Activity", icon: ShieldCheck },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // Highlight only the single best (longest-prefix) matching nav item, so a
  // sub-page like /admin/customers/marketing doesn't also light up the
  // sibling "All Customers" (/admin/customers) entry.
  const allHrefs = NAV.flatMap((g) => g.items.map((i) => i.href));
  const bestMatch = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6 thin-scrollbar">
      <Link href="/admin" className="px-2">
        <p className="font-display text-xl text-gold">Zarghoon Jewellers</p>
        <p className="text-[10px] uppercase tracking-[0.25em] text-cream/50">Admin Panel</p>
      </Link>

      {NAV.map((group, gi) => (
        <div key={gi}>
          {group.title && (
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-cream/40">
              {group.title}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = item.href === bestMatch;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-gold text-maroon-dark font-medium" : "text-cream/75 hover:bg-white/5 hover:text-cream",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
