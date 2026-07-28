export function LoadingSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-navy-800/70 animate-pulse-slow" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center text-center py-12 px-6">
      <p className="text-slate-200 font-medium">{title}</p>
      {description && <p className="text-slate-400 text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-card border-l-4 border-l-signal-down py-6 px-6 text-sm text-slate-200">
      {message}
    </div>
  );
}
