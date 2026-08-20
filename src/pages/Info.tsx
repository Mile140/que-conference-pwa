import { useInfoPages } from "../lib/infoPages";

interface InfoProps {
  path?: string;
}

export default function Info(_props: InfoProps) {
  const { pages, loading } = useInfoPages();

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Info</h2>
      </section>

      {loading && <p>Loading…</p>}
      {!loading && pages.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Wifi, parking, and local info will be posted here.</p>
      )}

      {pages.map((p) => (
        <div class="card" key={p.id}>
          <strong>{p.title}</strong>
          {p.body && <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{p.body}</p>}
        </div>
      ))}
    </>
  );
}
