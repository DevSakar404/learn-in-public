"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action-state";

/** Shows a toast whenever an action returns a new success message or error. */
export function useActionToast(state: ActionState) {
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.error && !state.fieldErrors) toast.error(state.error);
  }, [state]);
}
