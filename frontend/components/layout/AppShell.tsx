"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
