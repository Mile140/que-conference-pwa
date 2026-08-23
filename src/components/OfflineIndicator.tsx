import { isOnline } from "../lib/network";

/**
 * Sticky "you're offline" bar (spec §7 offline hardening). Shows whenever
 * the device has no network -- pages showing cached data get their own
 * per-page note (see CachedBanner), this is the app-wide "here's why things
 * look stale / some buttons won't work" signal.
 */
export default function OfflineIndicator() {
  if (isOnline.value) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        textAlign: "center",
        padding: "8px 16px",
        background: "var(--navy)",
        color: "var(--white)",
        fontSize: "0.85rem",
      }}
    >
      You're offline. Showing saved data where available — some actions need a connection.
    </div>
  );
}
