import { LoadingRegion, NoteListSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <LoadingRegion label="Loading notes" className="space-y-12">
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
      <NoteListSkeleton rows={6} />
    </LoadingRegion>
  );
}
