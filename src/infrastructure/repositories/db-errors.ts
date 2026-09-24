import type { PostgrestError } from "@supabase/supabase-js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type DomainError,
} from "@/domain/shared/errors";

/** Expected Postgres failures become domain errors; anything else is a bug or outage and is thrown. */
export function toDomainError(
  error: PostgrestError,
  entity: string,
  op: "write" | "delete",
): DomainError {
  switch (error.code) {
    case "23505":
      return new ConflictError(`A ${entity} with the same ${uniqueField(error)} already exists`);
    case "23503":
      return op === "delete"
        ? new ConflictError(
            `This ${entity} is still in use. Move or delete what depends on it first.`,
          )
        : new ValidationError(`The ${entity} refers to something that doesn't exist`);
    case "23514":
    case "22P02":
      return new ValidationError(`Invalid ${entity}: ${error.message}`);
    case "PGRST116":
      return new NotFoundError(entity, "");
  }
  throw new Error(`${entity} ${op} failed: ${error.message} (${error.code})`);
}

function uniqueField(error: PostgrestError): string {
  return /\((\w+)\)=/.exec(error.details ?? "")?.[1] ?? "value";
}

type Read<T> = { data: T | null; error: PostgrestError | null };

/** For single-row reads: any error is unexpected; null means not found. */
export function throwOnError<T>(result: Read<T>, what: string): T | null {
  if (result.error) throw new Error(`${what} failed: ${result.error.message}`);
  return result.data;
}

/** For list reads. */
export function rowsOrThrow<T>(result: Read<T[]>, what: string): T[] {
  return throwOnError(result, what) ?? [];
}
