interface LogoProps {
  size?: number;
  showText?: boolean;
}

export default function Logo({ size = 40, showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-xl border border-gold-700/60 bg-gradient-to-br from-ink-800 to-ink-950 shadow-[0_0_20px_-4px_rgba(212,175,55,0.5)]"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55}>
          <defs>
            <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f7e9b0" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#9c7a22" />
            </linearGradient>
          </defs>
          <path d="M6 8 L12 3 L18 8 L12 21 Z" fill="url(#logo-g)" />
          <path d="M6 8 L18 8 L12 21 Z" fillOpacity="0.18" fill="#0a0908" />
        </svg>
      </div>
      {showText && (
        <div className="leading-tight text-left">
          <div className="font-serif text-xl font-semibold tracking-wide text-gold-100">
            Zarghoon
          </div>
          <div className="-mt-1 text-[11px] uppercase tracking-[0.25em] text-gold-500/80">
            Jewellers
          </div>
        </div>
      )}
    </div>
  );
}
