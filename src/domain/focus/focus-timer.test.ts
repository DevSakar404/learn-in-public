import { describe, expect, it } from "vitest";
import {
  applySync,
  BREAK_MS,
  freshState,
  MAX_TICK_MS,
  parseFocusState,
  setOff,
  setTarget,
  startBreakNow,
  tick,
  type FocusEvent,
  type FocusState,
  type TickInput,
} from "./focus-timer";

const SEC = 1_000;
const MIN = 60 * SEC;
const DAY = "2026-10-28";
/** Wall-clock time on DAY (the reducer only compares numbers). */
const at = (h: number, m: number) => Date.UTC(2026, 9, 28, h, m);
const lesson1 = { slug: "lesson-1", totalMs: 12 * MIN };
const lesson2 = { slug: "lesson-2", totalMs: 15 * MIN };

/** Tick once a second over [from, to], like the browser does, collecting events. */
function run(
  state: FocusState,
  from: number,
  to: number,
  input: Partial<Omit<TickInput, "now">> = {},
): { state: FocusState; events: FocusEvent[] } {
  const events: FocusEvent[] = [];
  for (let now = from; now <= to; now += SEC) {
    const r = tick(state, { now, localDay: DAY, active: true, page: null, ...input });
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const minutes = (s: FocusState) => s.focusMs / MIN;

describe("focus timer: the example day (target 25 min)", () => {
  // 9:00 lesson 1 (12 min) · 9:05 its playground · 9:08–9:11 away · 9:15 done
  // 9:15 lesson 2 (15 min) · 9:28 pomodoro full, page still running · 9:30 done → break to 9:35
  it("counts each minute once, defers the break to the page, and survives a reload", () => {
    let s = freshState(DAY);

    // 1–2. Opening lesson 1 starts both timers; the playground shares the same slug.
    let r = run(s, at(9, 0), at(9, 8), { page: lesson1 });
    s = r.state;
    expect(s.pomodoro.phase).toBe("focus");
    expect(s.pages["lesson-1"]?.doneMs).toBe(8 * MIN);

    // 3. Tab hidden: nothing counts.
    s = run(s, at(9, 8) + SEC, at(9, 11), { page: lesson1, active: false }).state;
    expect(minutes(s)).toBe(8);

    // 4. Back at 9:11; lesson 1 done at 9:15 (8 + 4 active minutes), counted once.
    r = run(s, at(9, 11), at(9, 15), { page: lesson1 });
    s = r.state;
    expect(r.events).toEqual([{ type: "page-done", slug: "lesson-1" }]);
    expect(minutes(s)).toBe(12);

    // 5. Lesson 2: the pomodoro fills at 9:28 with 2 minutes of the page left, so the break waits.
    r = run(s, at(9, 15), at(9, 28), { page: lesson2 });
    s = r.state;
    expect(r.events).toEqual([{ type: "pomodoro-done", breakDeferred: true }]);
    expect(s.pomodoro.phase).toBe("focus");

    // 6. Page done at 9:30 → the break starts; total 27 / 25.
    r = run(s, at(9, 28), at(9, 30), { page: lesson2 });
    s = r.state;
    expect(r.events).toEqual([{ type: "page-done", slug: "lesson-2" }]);
    expect(s.pomodoro).toEqual({ phase: "break", focusMs: 0, breakEndsAt: at(9, 35) });
    expect(minutes(s)).toBe(27);

    // A reload keeps the break's end time.
    const reloaded = parseFocusState(JSON.stringify(s), DAY);
    expect(reloaded).toEqual(s);

    // During the break nothing counts; at 9:35 it ends and the next pomodoro auto-starts on a post.
    r = run(reloaded, at(9, 30) + SEC, at(9, 35), { page: lesson2 });
    expect(r.events).toEqual([{ type: "break-over" }]);
    expect(r.state.pomodoro.phase).toBe("focus");
    expect(minutes(r.state)).toBe(27);

    // 7. Local midnight: counters reset, the target and the off switch are kept.
    const next = tick(
      { ...r.state, target: 50 },
      { now: at(24, 0), localDay: "2026-10-29", active: true, page: null },
    ).state;
    expect(next).toMatchObject({ day: "2026-10-29", focusMs: 0, pages: {}, target: 50 });
    expect(next.pomodoro.phase).toBe("idle");
  });
});

describe("focus timer: rules", () => {
  it("starts the break right away when no page is running", () => {
    // A pomodoro started on a post; the reader then browses the blog list.
    const s: FocusState = {
      ...freshState(DAY),
      pomodoro: { phase: "focus", focusMs: 0, breakEndsAt: null },
    };
    const done = run(s, at(10, 0), at(10, 25));
    expect(done.events).toEqual([{ type: "pomodoro-done", breakDeferred: false }]);
    expect(done.state.pomodoro.breakEndsAt).toBe(at(10, 25) + BREAK_MS);
  });

  it("starts the deferred break when the reader leaves the page", () => {
    let s = run(freshState(DAY), at(9, 0), at(9, 25), {
      page: { slug: "long", totalMs: 40 * MIN },
    }).state;
    expect(s.pomodoro.phase).toBe("focus");
    s = tick(s, { now: at(9, 25) + SEC, localDay: DAY, active: true, page: null }).state;
    expect(s.pomodoro.phase).toBe("break");
  });

  it("does not start a pomodoro off a post page", () => {
    const s = run(freshState(DAY), at(9, 0), at(9, 10)).state;
    expect(s.pomodoro.phase).toBe("idle");
    expect(s.focusMs).toBe(0);
  });

  it("caps a long gap between ticks (laptop asleep)", () => {
    let s = run(freshState(DAY), at(9, 0), at(9, 1), { page: lesson1 }).state;
    s = tick(s, { now: at(11, 1), localDay: DAY, active: true, page: lesson1 }).state;
    expect(s.focusMs).toBe(1 * MIN + MAX_TICK_MS);
  });

  it("counts nothing and starts nothing when switched off", () => {
    const s = run(setOff(freshState(DAY), true), at(9, 0), at(9, 30), { page: lesson1 }).state;
    expect(s.focusMs).toBe(0);
    expect(s.pomodoro.phase).toBe("idle");
    expect(s.pages).toEqual({});
  });

  it("pauses the page during 'Break now' and resumes it after", () => {
    let s = run(freshState(DAY), at(9, 0), at(9, 5), { page: lesson1 }).state;
    s = startBreakNow(s, at(9, 5));
    s = run(s, at(9, 5), at(9, 10), { page: lesson1 }).state; // break ends at 9:10
    expect(s.pages["lesson-1"]?.doneMs).toBe(5 * MIN);
    s = run(s, at(9, 10), at(9, 12), { page: lesson1 }).state;
    expect(s.pages["lesson-1"]?.doneMs).toBe(7 * MIN);
  });

  it("starts fresh from missing or corrupt saved state", () => {
    expect(parseFocusState(null, DAY)).toEqual(freshState(DAY));
    expect(parseFocusState("{not json", DAY)).toEqual(freshState(DAY));
    expect(parseFocusState(JSON.stringify({ version: 0 }), DAY)).toEqual(freshState(DAY));
  });
});

describe("focus timer: admin sync", () => {
  const reply = { otherMinutes: 10, target: 75 as const };

  it("adopts the other devices' minutes and the server target when nothing changed here", () => {
    const s = applySync(freshState(DAY), reply, { day: DAY, target: undefined });
    expect(s).toMatchObject({ otherMinutes: 10, target: 75, targetDirty: false });
  });

  it("clears the dirty flag once the server has saved the target it was sent", () => {
    const s = setTarget(freshState(DAY), 50);
    expect(s.targetDirty).toBe(true);
    const synced = applySync(s, { otherMinutes: 0, target: 50 }, { day: DAY, target: 50 });
    expect(synced).toMatchObject({ target: 50, targetDirty: false });
  });

  it("keeps a target changed while the request was in flight", () => {
    const s = setTarget(setTarget(freshState(DAY), 50), 100); // sent 50, then picked 100
    const synced = applySync(s, { otherMinutes: 3, target: 50 }, { day: DAY, target: 50 });
    expect(synced).toMatchObject({ target: 100, targetDirty: true, otherMinutes: 3 });
  });

  it("ignores other-device minutes from a reply for an earlier day", () => {
    const s = applySync(freshState("2026-10-29"), reply, { day: DAY, target: undefined });
    expect(s.otherMinutes).toBe(0);
  });

  it("resets other-device minutes at midnight but keeps an unsent target", () => {
    const s = { ...setTarget(freshState(DAY), 50), otherMinutes: 30 };
    const next = tick(s, { now: at(24, 0), localDay: "2026-10-29", active: true, page: null });
    expect(next.state).toMatchObject({ otherMinutes: 0, target: 50, targetDirty: true });
  });

  it("reads state saved before these fields existed", () => {
    const old: Partial<FocusState> = freshState(DAY);
    delete old.otherMinutes;
    delete old.targetDirty;
    expect(parseFocusState(JSON.stringify(old), DAY)).toEqual(freshState(DAY));
  });
});
