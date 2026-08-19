import { useMemo, useState } from "preact/hooks";
import RouterLink from "../components/RouterLink";
import {
  formatDay,
  formatTimeRange,
  groupByDay,
  TYPE_LABELS,
  useSessions,
  type SessionType,
} from "../lib/sessions";

interface ScheduleProps {
  path?: string;
}

export default function Schedule(_props: ScheduleProps) {
  const { sessions, loading, error } = useSessions();
  const [trackFilter, setTrackFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const tracks = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.track).filter(Boolean))) as string[],
    [sessions]
  );
  const rooms = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.room).filter(Boolean))) as string[],
    [sessions]
  );

  const filtered = sessions.filter(
    (s) =>
      (!trackFilter || s.track === trackFilter) &&
      (!roomFilter || s.room === roomFilter) &&
      (!typeFilter || s.type === typeFilter)
  );
  const days = groupByDay(filtered);

  return (
    <>
      <section class="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={typeFilter} onChange={(e) => setTypeFilter((e.target as HTMLSelectElement).value)}>
            <option value="">All types</option>
            {(Object.keys(TYPE_LABELS) as SessionType[]).map((t) => (
              <option value={t} key={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {rooms.length > 0 && (
            <select value={roomFilter} onChange={(e) => setRoomFilter((e.target as HTMLSelectElement).value)}>
              <option value="">All rooms</option>
              {rooms.map((r) => (
                <option value={r} key={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          {tracks.length > 0 && (
            <select value={trackFilter} onChange={(e) => setTrackFilter((e.target as HTMLSelectElement).value)}>
              <option value="">All tracks</option>
              {tracks.map((t) => (
                <option value={t} key={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {loading && <p>Loading schedule…</p>}
      {error && <p style={{ color: "crimson" }}>Couldn't load the schedule: {error}</p>}
      {!loading && !error && days.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No sessions match those filters.</p>
      )}

      {days.map(({ day, sessions: daySessions }) => (
        <section key={day}>
          <h2>{formatDay(day)}</h2>
          {daySessions.map((s) => (
            <RouterLink href={`/schedule/${s.id}`} key={s.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div class="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{s.title}</strong>
                  <span class="badge-gold">{TYPE_LABELS[s.type]}</span>
                </div>
                <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                  {formatTimeRange(s)}
                  {s.room ? ` · ${s.room}` : ""}
                </div>
              </div>
            </RouterLink>
          ))}
        </section>
      ))}
    </>
  );
}
