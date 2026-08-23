import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";
import RouterLink from "../components/RouterLink";
import PageHero from "../components/PageHero";
import {
  formatTimeRange,
  partitionNowNext,
  TYPE_LABELS,
  useSessions,
  type Session,
} from "../lib/sessions";

interface Announcement {
  id: string;
  body: string;
  created_at: string;
}

interface HomeProps {
  // preact-router passes `path` to route children; declared explicitly
  // here rather than relying on preact-router's module augmentation,
  // which doesn't reliably apply under the automatic JSX runtime.
  path?: string;
}

function SessionRow({ session }: { session: Session }) {
  return (
    <RouterLink href={`/schedule/${session.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div class="session-row" title={TYPE_LABELS[session.type]}>
        <div class={`session-bar session-bar-${session.type}`} />
        <div style={{ flex: 1 }}>
          <strong>{session.title}</strong>
          <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
            {formatTimeRange(session)}
            {session.room ? ` · ${session.room}` : ""}
          </div>
        </div>
      </div>
    </RouterLink>
  );
}

function NowNext() {
  const { sessions, loading } = useSessions();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Re-evaluate periodically so sessions roll from "next" to "now" to
    // "past" live without requiring a page reload.
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <p>Loading schedule…</p>;
  if (sessions.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>Schedule hasn't been loaded yet.</p>;
  }

  const { current, next } = partitionNowNext(sessions, now);

  return (
    <>
      <h3 style={{ marginBottom: 8 }}>Now</h3>
      {current.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nothing happening right now.</p>
      ) : (
        current.map((s) => <SessionRow session={s} key={s.id} />)
      )}

      <h3 style={{ marginBottom: 8, marginTop: 16 }}>Next</h3>
      {next.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>That's the end of the schedule.</p>
      ) : (
        next.map((s) => <SessionRow session={s} key={s.id} />)
      )}
    </>
  );
}

/**
 * Landing screen (spec §3.1): Now & Next + announcements feed, newest first.
 */
export default function Home(_props: HomeProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        if (error) console.error("Failed to load announcements", error);
        setAnnouncements((data as Announcement[]) ?? []);
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel("announcements-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          setAnnouncements((current) => [payload.new as Announcement, ...current]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <PageHero eyebrow="2026 QUE Group Conference" title="Now & Next" />
      <NowNext />

      <section style={{ marginTop: 24 }}>
        <h2>Announcements</h2>
        {loading && <p>Loading…</p>}
        {!loading && announcements.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No announcements yet.</p>
        )}
        {announcements.map((a) => (
          <div class="card" key={a.id}>
            <p style={{ margin: 0 }}>{a.body}</p>
            <span class="badge-gold" style={{ marginTop: 8, display: "inline-block" }}>
              {new Date(a.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
