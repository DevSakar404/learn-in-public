"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTopic, saveTopic } from "@/app/actions/topics";
import { ConfirmButton } from "@/components/confirm-button";
import { FieldError } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/components/use-action-toast";
import type { Topic } from "@/domain/topic/topic";
import { initialActionState } from "@/lib/action-state";

function TopicForm({ topic }: { topic?: Topic }) {
  const [state, action] = useActionState(
    saveTopic.bind(null, topic?.id ?? null),
    initialActionState,
  );
  useActionToast(state);
  const prefix = topic?.id ?? "new";
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start"
      noValidate
    >
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-name`} className={topic ? "sr-only" : undefined}>
          Name
        </Label>
        <Input
          id={`${prefix}-name`}
          name="name"
          defaultValue={topic?.name}
          key={topic?.name}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
        />
        <FieldError id={`${prefix}-name-error`} errors={errors.name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-description`} className={topic ? "sr-only" : undefined}>
          Description
        </Label>
        <Input
          id={`${prefix}-description`}
          name="description"
          defaultValue={topic?.description}
          key={topic?.description}
          aria-invalid={!!errors.description}
        />
        <FieldError id={`${prefix}-description-error`} errors={errors.description} />
      </div>
      <SubmitButton
        variant={topic ? "outline" : "default"}
        className={topic ? undefined : "sm:mt-5"}
        pendingText="Saving…"
      >
        {topic ? "Save" : "Add topic"}
      </SubmitButton>
    </form>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4 lg:flex-row lg:items-start">
      <div className="flex-1">
        <TopicForm topic={topic} />
        <p className="mt-2 text-xs text-muted-foreground">/blog/topic/{topic.slug}</p>
      </div>
      <ConfirmButton
        label="Delete"
        title={`Delete "${topic.name}"?`}
        description="Topics that still have notes can't be deleted. Move or delete those notes first."
        disabled={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await deleteTopic(topic.id);
            if (r.error) toast.error(r.error);
            else toast.success(r.message);
          })
        }
      />
    </li>
  );
}

export function TopicManager({ topics }: { topics: Topic[] }) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="add-topic" className="space-y-3 rounded-xl border p-4">
        <h2 id="add-topic" className="font-semibold">
          Add a topic
        </h2>
        <TopicForm />
      </section>
      {topics.length ? (
        <ul className="space-y-3" aria-label="Topics">
          {topics.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No topics yet.</p>
      )}
    </div>
  );
}
