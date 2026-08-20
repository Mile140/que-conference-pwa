import { signal } from "@preact/signals";
import { registerSW } from "virtual:pwa-register";

/**
 * Service worker update handling. `registerType: "prompt"` (vite.config.ts)
 * means a new SW installs and waits rather than activating itself, so we
 * control exactly when the page reloads onto the new version -- surfaced as
 * a dismiss-free "Update available" banner (UpdateBanner.tsx) with a
 * Refresh button, matching the Project Board PWA's pattern.
 *
 * The browser only re-checks a service worker's script on a real page
 * navigation. This is a single-page app with client-side routing, so
 * someone who opens the app and just clicks around never triggers one --
 * without an explicit poll, "new version available" would only ever surface
 * after a full tab close/reopen or hard refresh. `PING_INTERVAL_MS` below
 * forces a check periodically instead.
 */
export const needRefresh = signal(false);
export const offlineReady = signal(false);

const PING_INTERVAL_MS = 60_000;

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
    onRegistered(registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update().catch((error) => {
          console.error("Service worker update check failed", error);
        });
      }, PING_INTERVAL_MS);
    },
  });
}

/** Activates the waiting service worker and reloads onto the new version. */
export async function applyUpdate() {
  if (!applyUpdateFn) return;
  needRefresh.value = false;
  await applyUpdateFn(true);
}
