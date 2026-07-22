export default function SectionHeading({ eyebrow, title, subtitle, center = false }) {
  return (
    <div className={center ? "text-center" : ""}>
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.2em] text-gold-dark">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-serif-display text-3xl text-ink md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-ink/60 md:text-lg">{subtitle}</p>}
    </div>
  );
}
