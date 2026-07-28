export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 shadow-neon-cyan">
        FX
      </span>
      <span className="text-slate-100">FlexX<span className="text-cyan-400">Signal</span></span>
    </span>
  );
}
