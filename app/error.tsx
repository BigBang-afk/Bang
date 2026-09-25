"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="font-medium text-slate-900">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        The page couldn&apos;t load. Your data is safe. Try again, and if it keeps happening restart the app.
      </p>
      <button onClick={reset} className="btn-primary mt-4">
        Try again
      </button>
    </div>
  );
}
