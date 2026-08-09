"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

const RANGES = [
  { value: "today", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

export function ReportRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "month";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface-2 p-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => update("range", r.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              range === r.value ? "bg-accent text-white" : "text-muted hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <>
          <Input type="date" defaultValue={searchParams.get("from") ?? ""} onChange={(e) => update("from", e.target.value)} className="w-40" />
          <Input type="date" defaultValue={searchParams.get("to") ?? ""} onChange={(e) => update("to", e.target.value)} className="w-40" />
        </>
      )}
      <a
        href={`/api/reports/export?${searchParams.toString()}`}
        className="flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 text-sm text-foreground hover:bg-surface-hover"
      >
        <Download size={14} /> Export CSV
      </a>
    </div>
  );
}
