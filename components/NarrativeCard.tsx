"use client";

export default function NarrativeCard({
  narrative,
  narrativeError,
}: {
  narrative?: string;
  narrativeError?: string;
}) {
  if (!narrative && !narrativeError) return null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <h3 className="text-sm font-semibold text-slate-200">AI commentary</h3>
      {narrative && <p className="mt-2 text-xs leading-relaxed text-slate-300">{narrative}</p>}
      {narrativeError && <p className="mt-2 text-xs text-slate-500">{narrativeError}</p>}
    </section>
  );
}
