import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-display font-bold", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-green to-brand-cyan">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
          <path
            d="M3 17L9 11L13 15L21 7"
            stroke="#05070d"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 7H21V13"
            stroke="#05070d"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-xl tracking-tight">Nexara</span>
    </div>
  );
}
