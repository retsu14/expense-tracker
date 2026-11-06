import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}
