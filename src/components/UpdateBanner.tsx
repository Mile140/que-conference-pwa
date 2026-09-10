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
        // Sticky at the very top of the viewport, above the header -- needs
        // the same iOS safe-area padding as .app-header (see theme.css) so
        // it doesn't render under the status bar/notch and become
        // unreadable and unclickable.
        padding: "10px 16px",
        paddingTop: "calc(10px + env(safe-area-inset-top))",
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
