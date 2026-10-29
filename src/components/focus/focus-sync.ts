import { syncFocus } from "@/app/actions/focus";
import { applySync } from "@/domain/focus/focus-timer";
import { getFocusState, updateFocusState } from "./focus-store";

// Admin only: browsers that have opened /admin send their daily total every minute.
// Readers never set the flag, so they never call the server.

const FLAG = "focus:sync";
const DEVICE = "focus:device";

/** Called from the admin layout. */
export function enableFocusSync() {
  try {
    localStorage.setItem(FLAG, "1");
    if (!localStorage.getItem(DEVICE)) localStorage.setItem(DEVICE, crypto.randomUUID());
  } catch {
    // Storage blocked: this browser just won't sync.
  }
}

function deviceId(): string | null {
  try {
    return localStorage.getItem(FLAG) ? localStorage.getItem(DEVICE) : null;
  } catch {
    return null;
  }
}

let inFlight = false;

/** Sends today's full total, so a failed or repeated send is fixed by the next one. */
export async function syncNow() {
  const device = deviceId();
  if (!device || inFlight) return;
  const s = getFocusState();
  const sent = { day: s.day, target: s.targetDirty ? s.target : undefined };
  inFlight = true;
  try {
    const r = await syncFocus({
      day: s.day,
      deviceId: device,
      minutes: Math.floor(s.focusMs / 60_000),
      target: sent.target,
    });
    if (r.ok) updateFocusState((cur) => applySync(cur, r, sent));
    // Logged out: stop until /admin is opened again. Minutes stay in this browser.
    else if (r.code === "UNAUTHORIZED") localStorage.removeItem(FLAG);
  } catch {
    // Offline or a server blip: the next minute sends the full total again.
  } finally {
    inFlight = false;
  }
}
