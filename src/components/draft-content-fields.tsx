"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TWEET_MAX, type PlatformContent, type PlatformPayload } from "@/domain/post/post";
import { cn } from "@/lib/utils";

const THREAD_SEPARATOR = "\n---\n";
const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        length > max ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {length}/{max}
    </span>
  );
}

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint}
      </div>
      {children}
    </div>
  );
}

/** Typed editors for each platform's structured draft. */
export function DraftContentFields({
  id,
  payload,
  onChange,
}: {
  id: string;
  payload: PlatformPayload;
  onChange: (p: PlatformPayload) => void;
}) {
  switch (payload.platform) {
    case "x": {
      const c = payload.content;
      const set = (content: PlatformContent["x"]) => onChange({ platform: "x", content });
      return (
        <div className="space-y-4">
          <Field
            id={`${id}-post`}
            label="Post"
            hint={<Counter length={c.post.length} max={TWEET_MAX} />}
          >
            <Textarea
              id={`${id}-post`}
              rows={4}
              value={c.post}
              onChange={(e) => set({ ...c, post: e.target.value })}
            />
          </Field>
          <Field
            id={`${id}-thread`}
            label="Thread (optional; separate tweets with a line containing ---)"
            hint={
              <span className="flex gap-2">
                {c.thread.map((t, i) => (
                  <Counter key={i} length={t.length} max={TWEET_MAX} />
                ))}
              </span>
            }
          >
            <Textarea
              id={`${id}-thread`}
              rows={8}
              value={c.thread.join(THREAD_SEPARATOR)}
              onChange={(e) =>
                set({
                  ...c,
                  thread: e.target.value
                    ? e.target.value.split(THREAD_SEPARATOR).map((t) => t.trim())
                    : [],
                })
              }
            />
          </Field>
        </div>
      );
    }
    case "linkedin": {
      const c = payload.content;
      const set = (content: PlatformContent["linkedin"]) =>
        onChange({ platform: "linkedin", content });
      return (
        <div className="space-y-4">
          <Field
            id={`${id}-hook`}
            label="Hook (first line)"
            hint={<Counter length={c.hook.length} max={200} />}
          >
            <Input
              id={`${id}-hook`}
              value={c.hook}
              onChange={(e) => set({ ...c, hook: e.target.value })}
            />
          </Field>
          <Field id={`${id}-body`} label="Body">
            <Textarea
              id={`${id}-body`}
              rows={12}
              value={c.body}
              onChange={(e) => set({ ...c, body: e.target.value })}
            />
          </Field>
          <Field id={`${id}-question`} label="Closing question">
            <Input
              id={`${id}-question`}
              value={c.question}
              onChange={(e) => set({ ...c, question: e.target.value })}
            />
          </Field>
        </div>
      );
    }
    case "instagram": {
      const c = payload.content;
      const set = (content: PlatformContent["instagram"]) =>
        onChange({ platform: "instagram", content });
      const setSlide = (i: number, slide: { title: string; body: string }) =>
        set({ ...c, slides: c.slides.map((s, j) => (j === i ? slide : s)) });
      return (
        <div className="space-y-4">
          <ol className="grid gap-3 sm:grid-cols-2" aria-label="Carousel slides">
            {c.slides.map((s, i) => (
              <li key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Slide {i + 1}</span>
                  {c.slides.length > 6 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => set({ ...c, slides: c.slides.filter((_, j) => j !== i) })}
                      aria-label={`Remove slide ${i + 1}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Label htmlFor={`${id}-slide-${i}-title`} className="sr-only">
                  Slide {i + 1} title
                </Label>
                <Input
                  id={`${id}-slide-${i}-title`}
                  value={s.title}
                  onChange={(e) => setSlide(i, { ...s, title: e.target.value })}
                />
                <Label htmlFor={`${id}-slide-${i}-body`} className="sr-only">
                  Slide {i + 1} body
                </Label>
                <Textarea
                  id={`${id}-slide-${i}-body`}
                  rows={3}
                  value={s.body}
                  onChange={(e) => setSlide(i, { ...s, body: e.target.value })}
                />
              </li>
            ))}
          </ol>
          {c.slides.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set({ ...c, slides: [...c.slides, { title: "", body: "" }] })}
            >
              Add slide
            </Button>
          )}
          <Field id={`${id}-caption`} label="Caption">
            <Textarea
              id={`${id}-caption`}
              rows={5}
              value={c.caption}
              onChange={(e) => set({ ...c, caption: e.target.value })}
            />
          </Field>
          <Field id={`${id}-hashtags`} label="Hashtags (space separated)">
            <Input
              id={`${id}-hashtags`}
              value={c.hashtags.join(" ")}
              onChange={(e) => set({ ...c, hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
            />
          </Field>
        </div>
      );
    }
    case "youtube": {
      const c = payload.content;
      const set = (content: PlatformContent["youtube"]) =>
        onChange({ platform: "youtube", content });
      return (
        <div className="space-y-4">
          <Field id={`${id}-titles`} label="Title options (one per line)">
            <Textarea
              id={`${id}-titles`}
              rows={4}
              value={c.titleOptions.join("\n")}
              onChange={(e) => set({ ...c, titleOptions: lines(e.target.value) })}
            />
          </Field>
          <Field id={`${id}-outline`} label="Script outline (one beat per line)">
            <Textarea
              id={`${id}-outline`}
              rows={8}
              value={c.outline.join("\n")}
              onChange={(e) => set({ ...c, outline: lines(e.target.value) })}
            />
          </Field>
          <Field id={`${id}-description`} label="Description">
            <Textarea
              id={`${id}-description`}
              rows={6}
              value={c.description}
              onChange={(e) => set({ ...c, description: e.target.value })}
            />
          </Field>
        </div>
      );
    }
  }
}
