"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/follow-ups", label: "Follow-ups" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-md px-2 py-1.5 sm:px-2.5 text-sm font-medium ${
              active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
