import { signal } from "@preact/signals";

/**
 * Global online/offline status (spec §7 offline hardening). Backed by the
 * browser's `navigator.onLine` plus the `online`/`offline` window events --
 * this only reflects "does the device have a network interface up," not
 * "can we actually reach Supabase" (a captive portal or dead wifi can still
 * report online=true). It's a good-enough signal for "should we bother
 * attempting a write, or tell the user up front instead of letting the
 * request hang/fail confusingly."
 */
export const isOnline = signal(typeof navigator === "undefined" ? true : navigator.onLine);

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline.value = true;
  });
  window.addEventListener("offline", () => {
    isOnline.value = false;
  });
}
