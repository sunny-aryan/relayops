import { Skeleton } from "@/components/ui/skeleton"

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-7 w-72" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}
