import { signal } from "@preact/signals";
import { registerSW } from "virtual:pwa-register";

/**
 * Service worker update handling. `registerType: "prompt"` (vite.config.ts)
 * means a new SW installs and waits rather than activating itself, so we
 * control exactly when the page reloads onto the new version -- surfaced as
 * a dismiss-free "Update available" banner (UpdateBanner.tsx) with a
 * Refresh button, matching the Project Board PWA's pattern.
 */
export const needRefresh = signal(false);
export const offlineReady = signal(false);

let applyUpdateFn: ((reload?: boolean) => Promise<void>) | null = null;

export function initUpdateSW() {
  applyUpdateFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh.value = true;
    },
    onOfflineReady() {
      offlineReady.value = true;
    },
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
    },
  });
}

/** Activates the waiting service worker and reloads onto the new version. */
export async function applyUpdate() {
  if (!applyUpdateFn) return;
  needRefresh.value = false;
  await applyUpdateFn(true);
}
