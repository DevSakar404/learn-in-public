import { FieldSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors NoteEditor's grid: title, topic + video, summary, markdown + preview. */
export function NoteEditorSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <FieldSkeleton className="md:col-span-2" />
        <FieldSkeleton />
        <FieldSkeleton />
        <FieldSkeleton className="md:col-span-2" tall />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="hidden h-96 rounded-lg lg:block" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg md:w-32" />
    </div>
  );
}
