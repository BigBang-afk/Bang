"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, ExternalLink, LogOut } from "lucide-react";
import { Sidebar } from "@/components/admin/Sidebar";

export function AdminTopbar({ adminName }: { adminName: string }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function onLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gold/20 bg-ivory px-4 py-3 lg:px-8">
      <button className="text-brown lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-6 w-6" />
      </button>
      <p className="hidden text-sm text-brown-light lg:block">Welcome back, {adminName}</p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 rounded-sm border border-maroon px-3.5 py-2 text-xs font-medium text-maroon transition hover:bg-maroon hover:text-cream"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Preview Website
        </Link>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-sm border border-cream-dark px-3.5 py-2 text-xs font-medium text-brown-light transition hover:border-maroon hover:text-maroon"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-brown">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
