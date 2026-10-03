import {
  LoadingRegion,
  PageHeaderSkeleton,
  PanelSkeleton,
  StatCardSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlannerLoading() {
  return (
    <LoadingRegion label="Loading planner" className="space-y-8">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton className="col-span-2 sm:col-span-1" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-28 w-full max-w-60 rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton>
          <Skeleton className="h-5 w-28" />
          <TextSkeleton lines={4} />
        </PanelSkeleton>
        <PanelSkeleton>
          <Skeleton className="h-5 w-28" />
          <TextSkeleton lines={6} />
        </PanelSkeleton>
      </div>
    </LoadingRegion>
  );
}
