import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminPagination({
  page,
  totalPages,
  baseUrl,
  searchParams = {},
}: {
  page: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildUrl = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
    );
    params.set("page", String(p));
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Link
        href={buildUrl(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(
          "rounded-sm border border-charcoal/20 px-3 py-1.5 text-sm",
          page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-charcoal hover:text-ivory"
        )}
      >
        Previous
      </Link>
      <span className="text-sm text-charcoal/60">Page {page} of {totalPages}</span>
      <Link
        href={buildUrl(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={cn(
          "rounded-sm border border-charcoal/20 px-3 py-1.5 text-sm",
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-charcoal hover:text-ivory"
        )}
      >
        Next
      </Link>
    </div>
  );
}
