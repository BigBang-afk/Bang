"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "@/lib/auth";
import type { User } from "@/lib/types";

export function Topbar({ title }: { title: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-graphite bg-void/80 backdrop-blur sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="badge-long">{user?.subscription_tier?.toUpperCase() ?? "FREE"}</span>
        <span className="text-sm text-gray-300">{user?.email}</span>
        <button onClick={logout} className="btn-secondary text-xs py-1.5">
          Sign out
        </button>
      </div>
    </header>
  );
}
