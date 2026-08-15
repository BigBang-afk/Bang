"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, ShieldCheck, ChevronDown } from "lucide-react";

export function UserMenu({
  name,
  email,
  role,
  avatarColor,
}: {
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-2 py-1.5 pr-3 hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[#05070d]"
          style={{ backgroundColor: avatarColor }}
        >
          {initial}
        </span>
        <span className="text-sm font-medium hidden sm:inline">{name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border-subtle bg-background-elevated shadow-2xl shadow-black/40 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-foreground-muted truncate">{email}</p>
          </div>
          <div className="p-1.5 flex flex-col">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-surface-hover transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-foreground-muted" />
              Dashboard
            </Link>
            {role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-surface-hover transition-colors"
              >
                <ShieldCheck className="h-4 w-4 text-foreground-muted" />
                Admin Panel
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
