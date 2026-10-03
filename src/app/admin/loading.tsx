import { LoadingRegion, PageHeaderSkeleton, StatCardSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

export default function DashboardLoading() {
  return (
    <LoadingRegion label="Loading dashboard" className="space-y-8">
      <PageHeaderSkeleton description={false} actions={1} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <StatCardSkeleton key={i} className={cn(i === 0 && "col-span-2 lg:col-span-1")} />
        ))}
      </div>
    </LoadingRegion>
  );
}
