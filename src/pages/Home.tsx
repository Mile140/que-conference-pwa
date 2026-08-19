import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";

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

/**
 * Landing screen (spec §3.1): Now & Next + announcements feed, newest
 * first. Session data and the real "what's happening right now across
 * every room" logic land in Phase 2 — this wires the announcements feed
 * live against Supabase so the schema/RLS/realtime path is proven end to
 * end before more content is layered on.
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
      <section class="card">
        <h2 style={{ marginTop: 0 }}>Now &amp; Next</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Session schedule lands in Phase 2 — this will show what's running right now
          across every room, plus what's up next.
        </p>
      </section>

      <section>
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
