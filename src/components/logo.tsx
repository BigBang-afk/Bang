import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-4"
          aria-hidden="true"
        >
          <path
            d="M4 16l5-6 4 4 7-9"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-base text-foreground">Lumenex</span>
    </span>
  );
}
