export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gold-dark">{eyebrow}</p>}
      <h2 className="text-balance font-serif text-3xl text-charcoal sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-sm leading-relaxed text-charcoal/60 sm:text-base">{description}</p>}
    </div>
  );
}
