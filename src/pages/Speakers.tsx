import RouterLink from "../components/RouterLink";
import CachedBanner from "../components/CachedBanner";
import { useSpeakers } from "../lib/speakers";
import { formatDay, formatTimeRange } from "../lib/sessions";

interface SpeakersProps {
  path?: string;
}

export default function Speakers(_props: SpeakersProps) {
  const { speakers, loading, error, stale } = useSpeakers();

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0 }}>Speakers</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 0 }}>
          Everyone presenting at the conference.
        </p>
      </section>

      {loading && <p>Loading…</p>}
      {stale && <CachedBanner />}
      {error && <p style={{ color: "crimson" }}>Couldn't load speakers: {error}</p>}
      {!loading && !error && speakers.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Speakers will be listed here as they're confirmed.</p>
      )}

      {speakers.map((s) => (
        <div class="card" key={s.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {s.photo_url && (
            <img
              src={s.photo_url}
              alt={s.name ?? ""}
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1 }}>
            <strong>{s.name || "(name pending)"}</strong>
            {(s.job_title || s.company) && (
              <div style={{ color: "var(--text-muted)" }}>
                {[s.job_title, s.company].filter(Boolean).join(" · ")}
              </div>
            )}
            {s.sponsors && (
              <div style={{ fontSize: "0.85rem", marginTop: 2 }}>
                Represents{" "}
                <RouterLink href={`/sponsors/${s.sponsors.id}`}>{s.sponsors.name}</RouterLink>
              </div>
            )}
            {s.bio && <p style={{ marginBottom: 4 }}>{s.bio}</p>}
            {s.session_speakers.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Speaking at:</div>
                {s.session_speakers.map(({ sessions: sess }) => (
                  <div key={sess.id}>
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
          </div>
        </div>
      ))}
    </>
  );
}
