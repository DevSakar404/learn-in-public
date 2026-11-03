"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteNote, publishNote, unpublishNote } from "@/app/actions/notes";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import type { Note } from "@/domain/note/note";
import type { ActionState } from "@/lib/action-state";

export function NoteActions({ note }: { note: Pick<Note, "id" | "slug" | "status"> }) {
  const [pending, startTransition] = useTransition();

  const run = (action: (id: string) => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action(note.id);
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {note.status === "published" ? (
        <>
          <Button variant="outline" asChild>
            <Link href={`/blog/${note.slug}`} target="_blank">
              View on blog <ArrowUpRightIcon data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => run(unpublishNote)}>
            Unpublish
          </Button>
        </>
      ) : (
        <Button disabled={pending} onClick={() => run(publishNote)}>
          Publish
        </Button>
      )}
      <ConfirmButton
        label="Delete"
        title="Delete this note?"
        description="This permanently deletes the note and all of its social drafts. This can't be undone."
        disabled={pending}
        onConfirm={() => run(deleteNote)}
      />
    </div>
  );
}
