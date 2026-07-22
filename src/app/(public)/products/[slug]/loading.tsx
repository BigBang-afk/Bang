import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    </div>
  );
}
