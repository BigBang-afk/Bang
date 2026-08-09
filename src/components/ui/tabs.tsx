"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  paramName = "tab",
  defaultTab,
}: {
  tabs: { value: string; label: string }[];
  paramName?: string;
  defaultTab?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(paramName) ?? defaultTab ?? tabs[0]?.value;

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 p-1">
      {tabs.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramName, tab.value);
        return (
          <button
            key={tab.value}
            onClick={() => router.push(`${pathname}?${params.toString()}`)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              active === tab.value ? "bg-accent text-white" : "text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
