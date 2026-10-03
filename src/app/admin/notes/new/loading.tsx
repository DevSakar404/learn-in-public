import { NoteEditorSkeleton } from "@/components/note-editor-skeleton";
import { LoadingRegion, PageHeaderSkeleton } from "@/components/skeletons";

export default function NewNoteLoading() {
  return (
    <LoadingRegion label="Loading editor" className="space-y-8">
      <PageHeaderSkeleton />
      <NoteEditorSkeleton />
    </LoadingRegion>
  );
}
