import type { Result } from "../shared/result";
import type { Subscriber } from "./subscriber";

export interface ISubscriberReader {
  list(): Promise<Subscriber[]>;
}

export interface ISubscriberWriter {
  /** ConflictError if the email already exists. */
  add(email: string): Promise<Result<void>>;
}
