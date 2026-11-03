"use client";

import { useEffect } from "react";
import { enableFocusSync } from "./focus-sync";

/** In the admin layout: marks this browser as the admin's, so the public focus timer syncs. */
export function FocusSyncFlag() {
  useEffect(enableFocusSync, []);
  return null;
}
