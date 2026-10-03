import { NoteEditorSkeleton } from "@/components/note-editor-skeleton";
import {
  FieldSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  PanelSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditNoteLoading() {
  return (
    <LoadingRegion label="Loading note" className="space-y-10">
      <PageHeaderSkeleton description={false} actions={3} />
      <NoteEditorSkeleton />
      <PanelSkeleton className="space-y-6 rounded-2xl">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <Skeleton className="h-16 w-full rounded-lg sm:h-8 sm:w-96" />
        <FieldSkeleton tall />
        <FieldSkeleton tall />
      </PanelSkeleton>
    </LoadingRegion>
  );
}
