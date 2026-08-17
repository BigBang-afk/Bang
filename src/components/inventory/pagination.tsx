import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && total <= pageSize) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">
        {total} item{total === 1 ? "" : "s"}
      </p>
    );
  }

  function hrefForPage(targetPage: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link href={hrefForPage(Math.max(1, page - 1))} aria-disabled={page <= 1}>
            <ChevronLeft className="size-4" />
            Previous
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
          <Link href={hrefForPage(Math.min(totalPages, page + 1))} aria-disabled={page >= totalPages}>
            Next
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
