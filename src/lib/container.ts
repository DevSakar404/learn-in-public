import "server-only";
import type { IClock } from "@/domain/clock";
import { SystemClock } from "@/infrastructure/system-clock";

/**
 * Composition root: the only place that instantiates concrete classes.
 * Routes and server actions get services from here. See docs/architecture/composition.md.
 */
const clock: IClock = new SystemClock();

export const container = {
  clock: () => clock,
};
