import { notFound } from "next/navigation";
import { z } from "zod";
import { NoteActions } from "@/components/note-actions";
import { NoteEditor } from "@/components/note-editor";
import { Badge } from "@/components/ui/badge";
import { container } from "@/lib/container";
import { requireAdminPage } from "../../../_lib/auth";

export const metadata = { title: "Edit note" };

export default async function EditNotePage({ params }: PageProps<"/admin/notes/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [note, topics] = await Promise.all([
    (await container.admin.notes()).get(id),
    (await container.admin.topics()).list(),
  ]);
  if (!note.ok) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Edit note</h1>
          <Badge variant={note.value.status === "published" ? "default" : "outline"}>
            {note.value.status}
          </Badge>
        </div>
        <NoteActions note={note.value} />
      </div>
      <NoteEditor note={note.value} topics={topics} />
    </div>
  );
}
