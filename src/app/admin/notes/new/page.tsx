import Link from "next/link";
import { NoteEditor } from "@/components/note-editor";
import { container } from "@/lib/container";
import { requireAdminPage } from "../../../_lib/auth";

export const metadata = { title: "New note" };

export default async function NewNotePage() {
  await requireAdminPage();
  const topics = await (await container.admin.topics()).list();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New note</h1>
      {topics.length ? (
        <NoteEditor topics={topics} />
      ) : (
        <p className="text-muted-foreground">
          Create a{" "}
          <Link href="/admin/topics" className="underline">
            topic
          </Link>{" "}
          first: every note belongs to one.
        </p>
      )}
    </div>
  );
}
