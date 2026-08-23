/**
 * Small inline note shown on a read page when it's displaying data from the
 * offline cache (see lib/offlineCache.ts) instead of a live Supabase fetch --
 * distinct from OfflineIndicator (app-wide "you have no network at all")
 * because a page can be stale even with network back up, until its next
 * successful reload.
 */
export default function CachedBanner() {
  return (
    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
      Showing saved data from earlier — reconnect and reload for the latest.
    </p>
  );
}
