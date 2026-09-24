"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { generateDrafts } from "@/app/actions/drafts";
import { DraftEditor } from "@/components/draft-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  isLocked,
  PLATFORM_LABELS,
  PLATFORMS,
  type AnyPost,
  type Platform,
} from "@/domain/post/post";

type Failure = { error: string; retryable: boolean };

export function DraftStudio({ noteId, initialPosts }: { noteId: string; initialPosts: AnyPost[] }) {
  const [posts, setPosts] = useState<Partial<Record<Platform, AnyPost>>>(
    Object.fromEntries(initialPosts.map((p) => [p.platform, p])),
  );
  const [failures, setFailures] = useState<Partial<Record<Platform, Failure>>>({});
  // "Generate all" skips drafts that are already approved or posted.
  const [selected, setSelected] = useState<Set<Platform>>(
    () =>
      new Set(PLATFORMS.filter((p) => !initialPosts.find((x) => x.platform === p && isLocked(x)))),
  );
  const [running, setRunning] = useState<Set<Platform>>(new Set());
  const [tab, setTab] = useState<Platform>("x");
  const [, startTransition] = useTransition();

  const run = (platforms: Platform[]) => {
    if (!platforms.length) return;
    setRunning((r) => new Set([...r, ...platforms]));
    startTransition(async () => {
      const result = await generateDrafts(noteId, platforms);
      setRunning((r) => new Set([...r].filter((p) => !platforms.includes(p))));
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const ok = result.outcomes.filter((o) => o.ok).length;
      setPosts((prev) => ({
        ...prev,
        ...Object.fromEntries(result.outcomes.flatMap((o) => (o.ok ? [[o.platform, o.post]] : []))),
      }));
      setFailures((prev) => {
        const next = { ...prev };
        for (const o of result.outcomes) {
          if (o.ok) delete next[o.platform];
          else next[o.platform] = { error: o.error, retryable: o.retryable };
        }
        return next;
      });
      if (ok === result.outcomes.length)
        toast.success(`Generated ${ok} draft${ok === 1 ? "" : "s"}.`);
      else
        toast.error(
          `${result.outcomes.length - ok} of ${result.outcomes.length} failed. See the tabs for details.`,
        );
    });
  };

  const toggle = (p: Platform, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });

  return (
    <section aria-labelledby="drafts" className="space-y-5 rounded-xl border p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="drafts" className="text-xl font-semibold">
            Social drafts
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate drafts from this note, edit them, then copy and post by hand.
          </p>
        </div>
        <fieldset className="flex flex-wrap items-center gap-4">
          <legend className="sr-only">Platforms to generate</legend>
          {PLATFORMS.map((p) => (
            <div key={p} className="flex items-center gap-2">
              <Checkbox
                id={`gen-${p}`}
                checked={selected.has(p)}
                onCheckedChange={(v) => toggle(p, v === true)}
              />
              <Label htmlFor={`gen-${p}`}>{PLATFORM_LABELS[p]}</Label>
            </div>
          ))}
          <Button onClick={() => run([...selected])} disabled={!selected.size || running.size > 0}>
            {running.size ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : (
              <SparklesIcon aria-hidden />
            )}
            {running.size ? "Generating…" : "Generate drafts"}
          </Button>
        </fieldset>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Platform)}>
        <TabsList className="flex-wrap">
          {PLATFORMS.map((p) => (
            <TabsTrigger key={p} value={p} className="gap-2">
              {PLATFORM_LABELS[p]}
              {running.has(p) ? (
                <Loader2Icon className="size-3 animate-spin" aria-label="generating" />
              ) : failures[p] ? (
                <Badge variant="destructive">error</Badge>
              ) : posts[p] ? (
                <Badge variant={posts[p]!.status === "draft" ? "outline" : "secondary"}>
                  {posts[p]!.status}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        {PLATFORMS.map((p) => {
          const post = posts[p];
          const failure = failures[p];
          return (
            <TabsContent key={p} value={p} className="pt-4">
              <div aria-live="polite" className="space-y-4">
                {running.has(p) && !post && (
                  <p className="text-muted-foreground">
                    Generating the {PLATFORM_LABELS[p]} draft…
                  </p>
                )}
                {failure && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm"
                  >
                    <span>{failure.error}</span>
                    {failure.retryable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => run([p])}
                        disabled={running.has(p)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                )}
                {post ? (
                  <DraftEditor
                    key={post.updatedAt.toString()}
                    post={post}
                    regenerating={running.has(p)}
                    onSaved={(saved) => setPosts((prev) => ({ ...prev, [p]: saved }))}
                    onRegenerate={() => run([p])}
                  />
                ) : (
                  !running.has(p) && (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-muted-foreground">No {PLATFORM_LABELS[p]} draft yet.</p>
                      <Button variant="outline" size="sm" onClick={() => run([p])}>
                        Generate {PLATFORM_LABELS[p]} draft
                      </Button>
                    </div>
                  )
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
