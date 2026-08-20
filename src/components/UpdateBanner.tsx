import { needRefresh, applyUpdate } from "../lib/updateSW";

/** "A new version is available" banner with a Refresh button (see lib/updateSW.ts). */
export default function UpdateBanner() {
  if (!needRefresh.value) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "var(--brand-accent)",
        color: "var(--white)",
        fontSize: "0.9rem",
      }}
    >
      <span>A new version of the app is available.</span>
      <button
        type="button"
        onClick={applyUpdate}
        style={{
          padding: "4px 12px",
          background: "var(--white)",
          color: "var(--navy)",
          border: "none",
          borderRadius: 6,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Refresh
      </button>
    </div>
  );
}
