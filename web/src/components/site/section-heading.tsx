import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs font-medium text-brand-green">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          {eyebrow}
        </span>
      )}
      <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="max-w-xl text-base text-foreground-muted">{description}</p>
      )}
    </div>
  );
}
