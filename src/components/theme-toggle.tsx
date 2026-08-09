"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { updateThemeAction } from "@/lib/actions/settings";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const options = [
  { value: "DARK", icon: Moon, label: "Dark" },
  { value: "LIGHT", icon: Sun, label: "Light" },
  { value: "SYSTEM", icon: Monitor, label: "System" },
] as const;

function applyTheme(pref: string) {
  let resolved = pref;
  if (pref === "SYSTEM") {
    resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "LIGHT" : "DARK";
  }
  if (resolved === "LIGHT") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("bang-theme", pref);
}

export function ThemeToggle({ current }: { current: string }) {
  const [, startTransition] = useTransition();

  return (
    <div className="inline-flex items-center rounded-lg border border-border-strong bg-surface-2 p-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => {
              applyTheme(opt.value);
              startTransition(() => {
                updateThemeAction(opt.value);
              });
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-accent text-white" : "text-muted hover:text-foreground"
            )}
          >
            <Icon size={14} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
