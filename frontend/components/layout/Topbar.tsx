export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-graphite bg-void/80 backdrop-blur sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-block h-2 w-2 rounded-full bg-bull animate-pulse" />
        <span className="text-gray-400 uppercase tracking-wider">Live MEXC data · no account required</span>
      </div>
    </header>
  );
}
