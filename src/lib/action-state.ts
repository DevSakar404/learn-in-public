import { z } from "zod";
import { ValidationError, type DomainError } from "@/domain/shared/errors";

/** What every form action returns to `useActionState`. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Echoed back so uncontrolled inputs keep what the user typed (React resets forms after an action). */
  values?: Record<string, string>;
}

export const initialActionState: ActionState = {};

export function fromZodError(error: z.ZodError): ActionState {
  return {
    error: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

export function fromDomainError(error: DomainError): ActionState {
  return {
    error: error.message,
    fieldErrors: error instanceof ValidationError ? error.fieldErrors : undefined,
  };
}
