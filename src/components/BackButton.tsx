interface BackButtonProps {
  fallbackHref: string;
}

/**
 * Detail pages (SessionDetail, SponsorDetail, ...) can be reached from
 * several different list/lookup pages -- Schedule, Home's Now & Next,
 * Speakers, the rotating sponsor footer, Sessions linked from a sponsor,
 * etc. -- so there's no single "parent" route to link back to. Prefer
 * actual browser/router history (`history.back()`) so the visitor lands
 * back wherever they actually came from; `fallbackHref` only covers the
 * rare case of a direct deep link (QR code, shared link) where there's no
 * in-app history to go back to.
 */
export default function BackButton({ fallbackHref }: BackButtonProps) {
  function handleClick(e: Event) {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
    // else: let the fallback <a href> navigate normally.
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 12,
        color: "var(--text-muted)",
        textDecoration: "none",
        fontSize: "0.9rem",
      }}
    >
      ← Back
    </a>
  );
}
