import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400" aria-hidden>
        ○
      </div>
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-4">
          {action.label}
        </Link>
      )}
    </div>
  );
}
