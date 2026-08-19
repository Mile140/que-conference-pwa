interface StubProps {
  title: string;
  phase: string;
  blurb: string;
}

/**
 * Placeholder for pages whose content lands in a later phase. Keeps routing,
 * nav, theming, and the offline shell provable in Phase 1 without faking
 * data for features that aren't built yet.
 */
export default function Stub({ title, phase, blurb }: StubProps) {
  return (
    <section class="card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ color: "var(--text-muted)" }}>{blurb}</p>
      <span class="badge-gold">{phase}</span>
    </section>
  );
}
