"use client";

import { useActionState, useState } from "react";
import { saveNote } from "@/app/actions/notes";
import { FieldError, FormMessage } from "@/components/form-message";
import { Markdown } from "@/components/markdown";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/components/use-action-toast";
import type { Note } from "@/domain/note/note";
import type { Topic } from "@/domain/topic/topic";
import { initialActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

/** All fields are controlled so nothing is lost when the server returns validation errors. */
export function NoteEditor({ note, topics }: { note?: Note; topics: Topic[] }) {
  const [state, action] = useActionState(saveNote.bind(null, note?.id ?? null), initialActionState);
  useActionToast(state);
  const [values, setValues] = useState({
    title: note?.title ?? "",
    summary: note?.summary ?? "",
    contentMd: note?.contentMd ?? "",
    topicId: note?.topic.id ?? topics[0]?.id ?? "",
    videoUrl: note?.videoUrl ?? "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const errors = state.fieldErrors ?? {};
  const bind = (name: keyof typeof values) => ({
    id: name,
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input {...bind("title")} required placeholder="Day 12: Why my RAG answers were wrong" />
          <FieldError id="title-error" errors={errors.title} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="topicId">Topic</Label>
          <NativeSelect {...bind("topicId")} required>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="topicId-error" errors={errors.topicId} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="videoUrl">YouTube URL (optional)</Label>
          <Input {...bind("videoUrl")} type="url" placeholder="https://youtu.be/…" />
          <FieldError id="videoUrl-error" errors={errors.videoUrl} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            {...bind("summary")}
            rows={2}
            placeholder="One or two sentences for the blog list and SEO."
          />
          <FieldError id="summary-error" errors={errors.summary} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="contentMd">Content (markdown)</Label>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="rounded px-2 py-1 text-sm underline-offset-4 hover:underline lg:hidden"
            aria-expanded={showPreview}
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            {...bind("contentMd")}
            rows={24}
            className={cn("font-mono text-sm", showPreview && "hidden lg:block")}
            placeholder={"# What I learned today\n\n```ts\n// code\n```"}
          />
          <section
            aria-label="Preview"
            className={cn(
              "min-h-40 overflow-auto rounded-md border p-4",
              !showPreview && "hidden lg:block",
            )}
          >
            {values.contentMd.trim() ? (
              <Markdown>{values.contentMd}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">The preview appears here.</p>
            )}
          </section>
        </div>
        <FieldError id="contentMd-error" errors={errors.contentMd} />
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton pendingText="Saving…">{note ? "Save changes" : "Create draft"}</SubmitButton>
        {state.fieldErrors && <FormMessage state={state} />}
      </div>
    </form>
  );
}
