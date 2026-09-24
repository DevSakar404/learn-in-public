import type { ActionState } from "@/lib/action-state";

/** Form-level error or success line, announced to screen readers. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    );
  }
  return null;
}

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {errors[0]}
    </p>
  );
}
