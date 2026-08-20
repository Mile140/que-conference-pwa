import RouterLink from "../components/RouterLink";
import { useSponsor } from "../lib/sponsors";
import { formatDay, formatTimeRange } from "../lib/sessions";

interface SponsorDetailProps {
  path?: string;
  id?: string; // populated by preact-router from the :id route param
}

export default function SponsorDetail({ id }: SponsorDetailProps) {
  const { sponsor, sessions, loading, notFound } = useSponsor(id);

  if (loading) return <p>Loading…</p>;
  if (notFound || !sponsor) return <p>Sponsor not found.</p>;

  return (
    <article class="card">
      {sponsor.logo_url && (
        <img src={sponsor.logo_url} alt={sponsor.name} style={{ maxHeight: 64, marginBottom: 12 }} />
      )}
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>{sponsor.name}</h2>

      {sponsor.sponsoring_text && (
        <p style={{ margin: "0 0 8px" }}>
          <span class="badge-gold">{sponsor.sponsoring_text}</span>
        </p>
      )}

      {sponsor.description && <p>{sponsor.description}</p>}

      {sponsor.website && (
        <p>
          <a href={sponsor.website} target="_blank" rel="noopener noreferrer">
            {sponsor.website.replace(/^https?:\/\//, "")}
          </a>
        </p>
      )}

      {sponsor.contact && (
        <p style={{ color: "var(--text-muted)" }}>
          <strong>Contact:</strong> {sponsor.contact}
        </p>
      )}

      {sessions.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border, #ddd)" }}>
          <strong>Presenting:</strong>
          {sessions.map((sess) => (
            <div key={sess.id} style={{ marginTop: 4 }}>
              <RouterLink href={`/schedule/${sess.id}`}>{sess.title}</RouterLink>
              <span style={{ color: "var(--text-muted)" }}>
                {" "}
                — {formatDay(sess.day)} · {formatTimeRange(sess)}
                {sess.room ? ` · ${sess.room}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
