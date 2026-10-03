import { LoadingRegion, NoteListSkeleton, TextSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <LoadingRegion className="space-y-16 sm:space-y-20">
      <div className="space-y-6">
        <Skeleton className="h-3 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full sm:h-12" />
          <Skeleton className="h-10 w-3/4 sm:h-12 sm:w-1/2" />
        </div>
        <TextSkeleton lines={4} />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-3 w-28" />
        <NoteListSkeleton rows={3} />
      </div>
    </LoadingRegion>
  );
}
