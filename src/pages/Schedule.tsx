import { useEffect, useMemo, useState } from "preact/hooks";
import RouterLink from "../components/RouterLink";
import CachedBanner from "../components/CachedBanner";
import PageHero from "../components/PageHero";
import { attendee, authSession } from "../lib/auth";
import { trackEvent } from "../lib/analytics";
import { useAgenda } from "../lib/agenda";
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
  const { sessions, loading, error, stale } = useSessions();
  const { sessionIds } = useAgenda();
  const [trackFilter, setTrackFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [myAgendaOnly, setMyAgendaOnly] = useState(false);
  const verified = authSession.value && attendee.value;

  useEffect(() => {
    trackEvent("view_schedule");
  }, []);

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
      (!typeFilter || s.type === typeFilter) &&
      (!myAgendaOnly || sessionIds.has(s.id))
  );
  const days = groupByDay(filtered);

  return (
    <>
      <PageHero eyebrow="2026 QUE Group Conference" title="Schedule" />

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
        {verified && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <input
              type="checkbox"
              checked={myAgendaOnly}
              onChange={(e) => setMyAgendaOnly((e.target as HTMLInputElement).checked)}
            />
            My agenda only
          </label>
        )}
      </section>

      {loading && <p>Loading schedule…</p>}
      {stale && <CachedBanner />}
      {error && <p style={{ color: "crimson" }}>Couldn't load the schedule: {error}</p>}
      {!loading && !error && days.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No sessions match those filters.</p>
      )}

      {days.map(({ day, sessions: daySessions }) => (
        <section key={day}>
          <h2>{formatDay(day)}</h2>
          {daySessions.map((s) => (
            <RouterLink href={`/schedule/${s.id}`} key={s.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div class="session-row" title={TYPE_LABELS[s.type]}>
                <div class={`session-bar session-bar-${s.type}`} />
                <div style={{ flex: 1 }}>
                  <strong>{s.title}</strong>
                  <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                    {formatTimeRange(s)}
                    {s.room ? ` · ${s.room}` : ""}
                  </div>
                </div>
                {sessionIds.has(s.id) && (
                  <span title="On my agenda" style={{ fontSize: "1.2rem", color: "var(--brand-highlight)" }}>
                    ★
                  </span>
                )}
              </div>
            </RouterLink>
          ))}
        </section>
      ))}
    </>
  );
}
