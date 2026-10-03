import { LoadingRegion, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotesLoading() {
  return (
    <LoadingRegion label="Loading notes" className="space-y-6">
      <PageHeaderSkeleton actions={1} />
      <div className="grid grid-cols-2 items-end gap-3 sm:flex">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-full rounded-lg sm:w-40" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-full rounded-lg sm:w-52" />
        </div>
        <Skeleton className="col-span-2 h-8 rounded-lg sm:col-span-1 sm:w-16" />
      </div>
      <TableSkeleton rows={6} columns={4} />
    </LoadingRegion>
  );
}
