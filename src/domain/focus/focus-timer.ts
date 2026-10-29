import { z } from "zod";

// Focus timer: a global 25/5 pomodoro plus a per-page session timer.
// Pure state + reducer; the browser ticks it once a second. Docs: docs/specs/pomodoro-timer.md

export const POMODORO_MS = 25 * 60_000;
export const BREAK_MS = 5 * 60_000;
/** A longer gap between ticks (laptop asleep, throttled tab) counts as this much at most. */
export const MAX_TICK_MS = 5_000;
export const FOCUS_TARGETS = [25, 50, 75, 100] as const;
export type FocusTarget = (typeof FOCUS_TARGETS)[number];

export const focusStateSchema = z.object({
  version: z.literal(1),
  /** The user's local date (YYYY-MM-DD); a new day resets the counters. */
  day: z.iso.date(),
  /** Today's focus time. A moment counts once, however many timers run. */
  focusMs: z.number().min(0),
  target: z.literal(FOCUS_TARGETS),
  off: z.boolean(),
  pomodoro: z.object({
    phase: z.enum(["idle", "focus", "break"]),
    /** Focus inside the current pomodoro, capped at POMODORO_MS. */
    focusMs: z.number().min(0),
    /** Absolute end time, so a break keeps running while the tab is hidden or reloaded. */
    breakEndsAt: z.number().nullable(),
  }),
  /** Today's progress per post slug (the post and its playground share one). */
  pages: z.record(z.string(), z.object({ doneMs: z.number().min(0), done: z.boolean() })),
  /** Last active tick; null after an inactive one, so time away never counts. */
  lastTickAt: z.number().nullable(),
  /** Admin sync only: today's minutes from other devices, and a target change not yet sent. */
  otherMinutes: z.number().min(0).default(0),
  targetDirty: z.boolean().default(false),
});
export type FocusState = z.infer<typeof focusStateSchema>;

export type FocusEvent =
  | { type: "page-done"; slug: string }
  | { type: "pomodoro-done"; breakDeferred: boolean }
  | { type: "break-over" };

export interface TickInput {
  now: number;
  localDay: string;
  /** The tab is visible and focused. Only the active tab counts. */
  active: boolean;
  /** The post on screen, or null on other pages. */
  page: { slug: string; totalMs: number } | null;
}

const IDLE: FocusState["pomodoro"] = { phase: "idle", focusMs: 0, breakEndsAt: null };

export function freshState(localDay: string): FocusState {
  return {
    version: 1,
    day: localDay,
    focusMs: 0,
    target: 25,
    off: false,
    pomodoro: IDLE,
    pages: {},
    lastTickAt: null,
    otherMinutes: 0,
    targetDirty: false,
  };
}

/** Saved JSON → state. Anything missing, old or corrupt starts fresh instead of throwing. */
export function parseFocusState(raw: string | null, localDay: string): FocusState {
  try {
    const parsed = focusStateSchema.safeParse(JSON.parse(raw ?? "null"));
    return parsed.success ? parsed.data : freshState(localDay);
  } catch {
    return freshState(localDay);
  }
}

export function tick(
  prev: FocusState,
  input: TickInput,
): { state: FocusState; events: FocusEvent[] } {
  const { now, page } = input;
  const events: FocusEvent[] = [];
  const delta =
    prev.lastTickAt === null ? 0 : Math.min(Math.max(now - prev.lastTickAt, 0), MAX_TICK_MS);
  const today =
    prev.day === input.localDay
      ? prev
      : {
          ...freshState(input.localDay),
          target: prev.target,
          off: prev.off,
          targetDirty: prev.targetDirty,
        };

  // The time since the last tick belongs to the phase it was spent in, not the one we switch to.
  const spentIn = today.pomodoro.phase;
  let pomodoro = today.pomodoro;
  if (pomodoro.phase === "break" && pomodoro.breakEndsAt !== null && now >= pomodoro.breakEndsAt) {
    pomodoro = IDLE;
    events.push({ type: "break-over" });
  }
  if (today.off || !input.active) {
    return { state: { ...today, pomodoro, lastTickAt: null }, events };
  }

  // Auto-start: being on a post starts a pomodoro (the first one, and the next after a break).
  if (pomodoro.phase === "idle" && page) pomodoro = { ...IDLE, phase: "focus" };

  const progress = page ? (today.pages[page.slug] ?? { doneMs: 0, done: false }) : null;
  const pageRunning = !!progress && !progress.done && spentIn !== "break";
  const focusMs = spentIn === "focus" || pageRunning ? today.focusMs + delta : today.focusMs;

  if (spentIn === "focus" && pomodoro.focusMs < POMODORO_MS) {
    pomodoro = { ...pomodoro, focusMs: Math.min(pomodoro.focusMs + delta, POMODORO_MS) };
    if (pomodoro.focusMs === POMODORO_MS) {
      events.push({ type: "pomodoro-done", breakDeferred: pageRunning });
    }
  }

  let pages = today.pages;
  let pageStillRunning = pageRunning;
  if (page && progress && pageRunning) {
    const doneMs = Math.min(progress.doneMs + delta, page.totalMs);
    const done = doneMs >= page.totalMs;
    pages = { ...pages, [page.slug]: { doneMs, done } };
    if (done) {
      events.push({ type: "page-done", slug: page.slug });
      pageStillRunning = false;
    }
  }

  // A full pomodoro breaks once no page session is still running: the break waits for the page.
  if (pomodoro.phase === "focus" && pomodoro.focusMs >= POMODORO_MS && !pageStillRunning) {
    pomodoro = { phase: "break", focusMs: 0, breakEndsAt: now + BREAK_MS };
  }

  return { state: { ...today, focusMs, pomodoro, pages, lastTickAt: now }, events };
}

/** "Break now": ends the current pomodoro early. The page timer pauses during the break. */
export function startBreakNow(state: FocusState, now: number): FocusState {
  if (state.pomodoro.phase !== "focus") return state;
  return { ...state, pomodoro: { phase: "break", focusMs: 0, breakEndsAt: now + BREAK_MS } };
}

export function setTarget(state: FocusState, target: FocusTarget): FocusState {
  return { ...state, target, targetDirty: true };
}

/**
 * Merges a sync reply. `sent` is what the request carried: a reply for an earlier day doesn't
 * set today's other-device minutes, and a target changed here while the request was in flight
 * stays local (and dirty) instead of being overwritten.
 */
export function applySync(
  state: FocusState,
  reply: { otherMinutes: number; target: FocusTarget },
  sent: { day: string; target: FocusTarget | undefined },
): FocusState {
  const otherMinutes = state.day === sent.day ? reply.otherMinutes : state.otherMinutes;
  if (state.targetDirty && state.target !== sent.target) return { ...state, otherMinutes };
  return { ...state, otherMinutes, target: reply.target, targetDirty: false };
}

export function setOff(state: FocusState, off: boolean): FocusState {
  return { ...state, off, lastTickAt: null };
}
