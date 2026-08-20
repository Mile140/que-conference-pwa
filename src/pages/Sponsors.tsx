import RouterLink from "../components/RouterLink";
import { useSponsors } from "../lib/sponsors";

interface SponsorsProps {
  path?: string;
}

export default function Sponsors(_props: SponsorsProps) {
  const { sponsors, loading } = useSponsors();

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Sponsors</h2>
      </section>

      {loading && <p>Loading…</p>}
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
