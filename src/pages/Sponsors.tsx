import RouterLink from "../components/RouterLink";
import CachedBanner from "../components/CachedBanner";
import PageHero from "../components/PageHero";
import { useSponsors } from "../lib/sponsors";

interface SponsorsProps {
  path?: string;
}

export default function Sponsors(_props: SponsorsProps) {
  const { sponsors, loading, stale } = useSponsors();

  return (
    <>
      <PageHero eyebrow="2026 QUE Group Conference" title="Sponsors" />

      {loading && <p>Loading…</p>}
      {stale && <CachedBanner />}
      {!loading && sponsors.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Sponsors will be listed here as they're confirmed.</p>
      )}

      {sponsors.map((s) => (
        <RouterLink href={`/sponsors/${s.id}`} key={s.id} style={{ textDecoration: "none", color: "inherit" }}>
          <div class="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {s.logo_url && (
              <img src={s.logo_url} alt={s.name} style={{ maxHeight: 40, maxWidth: 120, flexShrink: 0 }} />
            )}
            <div>
              <strong>{s.name}</strong>
              {s.sponsoring_text && (
                <div style={{ color: "var(--text-muted)" }}>{s.sponsoring_text}</div>
              )}
            </div>
          </div>
        </RouterLink>
      ))}
    </>
  );
}
