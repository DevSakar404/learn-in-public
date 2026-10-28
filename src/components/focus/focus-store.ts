import { useSyncExternalStore } from "react";
import {
  parseFocusState,
  tick,
  type FocusEvent,
  type FocusState,
} from "@/domain/focus/focus-timer";

// Browser side of the focus timer: state in localStorage, shared by FocusBar and PageTimer.
// The pure rules live in src/domain/focus/focus-timer.ts.

const KEY = "focus:v1";

export interface ActivePage {
  slug: string;
  totalMs: number;
  next: { title: string; href: string } | null;
}

/** The user's local date as YYYY-MM-DD. */
export const localDay = (d = new Date()) => d.toLocaleDateString("en-CA");

let state: FocusState | null = null;
let page: ActivePage | null = null;
/** This tab owned the last counted tick; only the owner may write an inactive tick. */
let wasActive = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): FocusState {
  try {
    return parseFocusState(localStorage.getItem(KEY), localDay());
  } catch {
    return parseFocusState(null, localDay()); // storage blocked
  }
}

export function getFocusState(): FocusState {
  if (!state) {
    state = load();
    // Another tab wrote: pick it up.
    window.addEventListener("storage", (e) => {
      if (e.key !== KEY) return;
      state = load();
      emit();
    });
  }
  return state;
}

export function updateFocusState(fn: (s: FocusState) => FocusState) {
  state = fn(getFocusState());
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or storage full: keep going in memory for this page view.
  }
  emit();
}

export function useFocusState(): FocusState | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getFocusState,
    () => null, // the server has no localStorage
  );
}

/** Registers the post on screen. Returns an unregister that only clears its own registration. */
export function setActivePage(p: ActivePage): () => void {
  page = p;
  return () => {
    if (page === p) page = null;
  };
}

const isActive = () => document.visibilityState === "visible" && document.hasFocus();

/** One tick of the clock. Only the focused tab counts and writes, so two tabs never double count. */
export function runTick(): { events: FocusEvent[]; page: ActivePage | null } {
  const active = isActive();
  if (!active && !wasActive) return { events: [], page };
  wasActive = active;
  let events: FocusEvent[] = [];
  updateFocusState((s) => {
    const r = tick(s, {
      now: Date.now(),
      localDay: localDay(),
      active,
      page: page && { slug: page.slug, totalMs: page.totalMs },
    });
    events = r.events;
    return r.state;
  });
  return { events, page };
}
