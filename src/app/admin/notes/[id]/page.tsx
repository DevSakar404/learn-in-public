import { notFound } from "next/navigation";
import { z } from "zod";
import { DraftStudio } from "@/components/draft-studio";
import { NoteActions } from "@/components/note-actions";
import { NoteEditor } from "@/components/note-editor";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { container } from "@/lib/container";
import { requireAdminPage } from "../../../_lib/auth";

export const metadata = { title: "Edit note" };

// Draft generation (a server action on this page) can take a while on the free tier.
export const maxDuration = 60;

export default async function EditNotePage({ params }: PageProps<"/admin/notes/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [note, topics, posts] = await Promise.all([
    (await container.admin.notes()).get(id),
    (await container.admin.topics()).list(),
    (await container.admin.posts()).listForNote(id),
  ]);
  if (!note.ok) notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        title="Edit note"
        badge={
          <Badge variant={note.value.status === "published" ? "default" : "outline"}>
            {note.value.status}
          </Badge>
        }
        actions={<NoteActions note={note.value} />}
      />
      <NoteEditor note={note.value} topics={topics} />
      <DraftStudio noteId={note.value.id} initialPosts={posts} />
    </div>
  );
}
