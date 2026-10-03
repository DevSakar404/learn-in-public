import {
  FieldSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  PanelSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function TopicsLoading() {
  return (
    <LoadingRegion label="Loading topics" className="space-y-8">
      <PageHeaderSkeleton />
      <PanelSkeleton>
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <FieldSkeleton />
          <FieldSkeleton />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </PanelSkeleton>
      <div className="divide-y divide-border/70">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3 py-5 first:pt-0">
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
