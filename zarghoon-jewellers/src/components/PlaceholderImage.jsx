const ICONS = {
  Rings: (
    <>
      <circle cx="50" cy="62" r="26" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M38 38 L50 18 L62 38 L54 42 L46 42 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </>
  ),
  Necklaces: (
    <>
      <path
        d="M22 24c0 26 12 44 28 44s28-18 28-44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M42 66 L50 84 L58 66 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </>
  ),
  Earrings: (
    <>
      <circle cx="34" cy="26" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M34 35c0 16 0 26 0 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M27 69 L34 84 L41 69 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="66" cy="26" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M66 35c0 16 0 26 0 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M59 69 L66 84 L73 69 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </>
  ),
  Bangles: (
    <>
      <ellipse cx="50" cy="52" rx="30" ry="26" fill="none" stroke="currentColor" strokeWidth="6" />
    </>
  ),
};

function hashHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 360;
  return hash;
}

export default function PlaceholderImage({ id = "", category, name, className = "" }) {
  const angle = 45 + (hashHue(id) % 60);
  const icon = ICONS[category] ?? ICONS.Rings;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, #17161a 0%, #0b0b0c 55%, #2a2313 100%)`,
      }}
      role="img"
      aria-label={`${name ?? category} — photo placeholder`}
    >
      <svg viewBox="0 0 100 100" className="h-1/2 w-1/2 text-gold-light/70">
        {icon}
      </svg>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/30 bg-ink/60 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-gold/70">
        Photo coming soon
      </span>
    </div>
  );
}
