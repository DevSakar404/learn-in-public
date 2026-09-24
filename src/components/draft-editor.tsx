"use client";

import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDraft } from "@/app/actions/drafts";
import { DraftContentFields } from "@/components/draft-content-fields";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toPlainText } from "@/domain/post/format";
import {
  isLocked,
  POST_STATUSES,
  type AnyPost,
  type PlatformPayload,
  type PostStatus,
} from "@/domain/post/post";

interface Props {
  post: AnyPost;
  regenerating: boolean;
  onSaved: (post: AnyPost) => void;
  onRegenerate: () => void;
}

export function DraftEditor({ post, regenerating, onSaved, onRegenerate }: Props) {
  const [payload, setPayload] = useState<PlatformPayload>({
    platform: post.platform,
    content: post.content,
  } as PlatformPayload);
  const [status, setStatus] = useState<PostStatus>(post.status);
  const [postedUrl, setPostedUrl] = useState(post.postedUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const id = `draft-${post.platform}`;

  const save = () =>
    startSaving(async () => {
      const result = await updateDraft(post.id, { content: payload.content, status, postedUrl });
      if (result.ok) {
        setError(null);
        onSaved(result.post);
        toast.success("Draft saved.");
      } else {
        setError(result.error);
      }
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(payload));
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  return (
    <div className="space-y-6">
      <DraftContentFields id={id} payload={payload} onChange={setPayload} />

      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-status`}>Status</Label>
          <NativeSelect
            id={`${id}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
          >
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-url`}>Posted URL</Label>
          <Input
            id={`${id}-url`}
            type="url"
            placeholder="https://… (after you post it)"
            value={postedUrl}
            onChange={(e) => setPostedUrl(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm whitespace-pre-line text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={saving} aria-busy={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" onClick={copy}>
          <CopyIcon aria-hidden /> Copy
        </Button>
        <Button
          variant="ghost"
          onClick={onRegenerate}
          disabled={regenerating || isLocked(post)}
          title={
            isLocked(post) ? "Set the status back to draft (and save) to regenerate" : undefined
          }
        >
          <RefreshCwIcon className={regenerating ? "animate-spin" : undefined} aria-hidden />{" "}
          Regenerate
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {post.modelUsed} · prompt {post.promptVersion}
        {post.usage &&
          ` · ${post.usage.inputTokens ?? "?"} in / ${post.usage.outputTokens ?? "?"} out tokens · ${(post.usage.latencyMs / 1000).toFixed(1)}s`}
      </p>
    </div>
  );
}
