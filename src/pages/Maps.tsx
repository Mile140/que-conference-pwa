import { useVenueMaps } from "../lib/venueMaps";

interface MapsProps {
  path?: string;
}

function typeLabel(type: string | null): string | null {
  if (!type) return null;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function Maps(_props: MapsProps) {
  const { maps, loading } = useVenueMaps();

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Venue &amp; Maps</h2>
      </section>

      {loading && <p>Loading…</p>}
      {!loading && maps.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Maps will be posted here closer to the event.</p>
      )}

      {maps.map((m) => (
        <div class="card" key={m.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <strong>{m.title}</strong>
            {typeLabel(m.type) && <span class="badge-gold">{typeLabel(m.type)}</span>}
          </div>
          {m.image_url && (
            <img
              src={m.image_url}
              alt={m.title}
              style={{ width: "100%", marginTop: 8, borderRadius: 6 }}
            />
          )}
          {m.description && <p style={{ marginBottom: 0 }}>{m.description}</p>}
        </div>
      ))}
    </>
  );
}
