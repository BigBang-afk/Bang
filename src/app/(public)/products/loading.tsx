import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Skeleton className="mb-8 h-8 w-64" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <Skeleton className="h-96 lg:col-span-1" />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:col-span-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
