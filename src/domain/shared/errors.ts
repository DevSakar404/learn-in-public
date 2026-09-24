/** Expected failures. Services return these inside a Result; they never throw them. */
export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(entity: string, key: string) {
    super(`${entity} not found: ${key}`);
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION";
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  constructor() {
    super("Admin access required");
  }
}
