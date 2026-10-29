"use client";

import { TimerIcon, TimerOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FOCUS_TARGETS,
  POMODORO_MS,
  setOff,
  setTarget,
  startBreakNow,
  type FocusEvent,
  type FocusState,
} from "@/domain/focus/focus-timer";
import { cn } from "@/lib/utils";
import { runTick, updateFocusState, useFocusState, type ActivePage } from "./focus-store";
import { syncNow } from "./focus-sync";

export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

let audio: AudioContext | undefined;
/** A short soft beep. Browsers block sound until the reader has interacted with the page. */
function chime() {
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const t = audio.currentTime;
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  } catch {
    // No audio: the toast is enough.
  }
}

function announce(e: FocusEvent, page: ActivePage | null, open: (href: string) => void) {
  chime();
  if (e.type === "page-done") {
    const next = page?.next;
    toast.success("Session done", {
      description: next ? `Next: ${next.title}` : "Topic complete. Nice work.",
      action: next ? { label: "Open", onClick: () => open(next.href) } : undefined,
    });
  } else if (e.type === "pomodoro-done") {
    toast("Pomodoro done", {
      description: e.breakDeferred
        ? "Finish this page, then take a 5 minute break."
        : "Take a 5 minute break.",
    });
  } else {
    toast("Break over", { description: "Open a post to start the next pomodoro." });
  }
}

function status(s: FocusState): string {
  if (s.pomodoro.phase === "focus") return clock(POMODORO_MS - s.pomodoro.focusMs);
  if (s.pomodoro.phase === "break")
    return `Break ${clock((s.pomodoro.breakEndsAt ?? 0) - Date.now())}`;
  return "";
}

/** The header's daily focus total and the global pomodoro. Ticks the clock for every timer. */
export function FocusBar() {
  const state = useFocusState();
  const router = useRouter();
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const run = () => {
      const { events, page } = runTick();
      for (const e of events) announce(e, page, (href) => router.push(href));
    };
    const id = setInterval(run, 1000);
    // Count up to the moment the tab loses focus, then stop.
    window.addEventListener("blur", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(id);
      window.removeEventListener("blur", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [router]);

  // Admin browsers only (syncNow is a no-op elsewhere).
  useEffect(() => {
    void syncNow();
    const id = setInterval(syncNow, 60_000);
    window.addEventListener("pagehide", syncNow);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", syncNow);
    };
  }, []);

  // Close the menu on an outside click or Escape.
  useEffect(() => {
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !menu.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  if (!state) return null;
  const minutes = Math.floor(state.focusMs / 60_000) + state.otherMinutes;
  const met = minutes >= state.target;

  return (
    <div ref={menu} className="relative">
      <Button
        variant="ghost"
        className="px-1 font-normal sm:px-2.5"
        aria-expanded={open}
        aria-controls="focus-menu"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          state.off
            ? "Focus timer off. Open focus settings"
            : `Focus today: ${minutes} of ${state.target} minutes. Open focus settings`
        }
      >
        {state.off ? (
          <>
            <TimerOffIcon className="size-4" aria-hidden />
            <span className="hidden sm:inline">Focus off</span>
          </>
        ) : (
          <>
            <TimerIcon className={cn("size-4", met && "text-primary")} aria-hidden />
            <span className="tabular-nums">
              {minutes}/{state.target}
              <span className="hidden sm:inline"> min</span>
            </span>
            {status(state) && (
              <span className="hidden text-muted-foreground tabular-nums sm:inline">
                · {status(state)}
              </span>
            )}
          </>
        )}
      </Button>

      <div
        id="focus-menu"
        hidden={!open}
        className="absolute right-0 z-20 mt-2 w-64 space-y-4 rounded-lg border bg-background p-4 text-sm shadow-md max-sm:fixed max-sm:inset-x-4 max-sm:top-14 max-sm:w-auto"
      >
        {!state.off && (
          <p className="tabular-nums">
            {state.pomodoro.phase === "idle"
              ? "Pomodoro starts when you open a post."
              : `${state.pomodoro.phase === "focus" ? "Pomodoro " : ""}${status(state)} left`}
          </p>
        )}
        <fieldset className="space-y-2">
          <legend className="font-medium">Daily focus target</legend>
          <div className="flex gap-1">
            {FOCUS_TARGETS.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={state.target === t ? "default" : "outline"}
                aria-pressed={state.target === t}
                onClick={() => updateFocusState((s) => setTarget(s, t))}
              >
                {t}
              </Button>
            ))}
          </div>
          <p className="text-muted-foreground">Minutes. Pomodoros and page sessions both count.</p>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          {!state.off && state.pomodoro.phase === "focus" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateFocusState((s) => startBreakNow(s, Date.now()))}
            >
              Break now
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateFocusState((s) => setOff(s, !s.off))}
          >
            {state.off ? "Turn focus timer on" : "Turn focus timer off"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Saved in this browser only.</p>
      </div>
    </div>
  );
}
