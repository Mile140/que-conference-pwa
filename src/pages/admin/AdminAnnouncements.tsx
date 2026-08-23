import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import PageHero from "../../components/PageHero";
import { supabase } from "../../lib/supabase";

interface AdminAnnouncementsProps {
  path?: string;
}

interface AnnouncementRow {
  id: string;
  body: string;
  created_at: string;
  push_sent: boolean;
}

export default function AdminAnnouncements(_props: AdminAnnouncementsProps) {
  return (
    <AdminGuard>
      <AdminAnnouncementsContent />
    </AdminGuard>
  );
}

function AdminAnnouncementsContent() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error: err } = await supabase
      .from("announcements")
      .select("id, body, created_at, push_sent")
      .order("created_at", { ascending: false });
    if (err) console.error("Failed to load announcements", err);
    setAnnouncements((data as AnnouncementRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePost(e: Event) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.from("announcements").insert({ body: trimmed });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setBody("");
    await load();
  }

  async function handleDelete(id: string) {
    const { error: err } = await supabase.from("announcements").delete().eq("id", id);
    if (err) {
      console.error("Failed to delete announcement", err);
      return;
    }
    await load();
  }

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Announcements"
        subtitle="Posts immediately to the landing-page feed and personal agendas. Push delivery isn't wired up yet (see Phase 4 notes) — everyone sees this in-app only for now, whether they have the app installed or not."
      />

      <section class="card">
        <form onSubmit={handlePost} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={body}
            onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
            placeholder="e.g. Room B has moved to Room C for the 2pm session."
            rows={3}
            style={{ padding: 10, resize: "vertical" }}
          />
          {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
          <button type="submit" class="btn-gold" disabled={submitting || !body.trim()} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Posting…" : "Post announcement"}
          </button>
        </form>
      </section>

      {loading && <p>Loading…</p>}
      {!loading && announcements.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No announcements yet.</p>
      )}

      {announcements.map((a) => (
        <div class="card" key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0 }}>{a.body}</p>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
          <button type="button" onClick={() => handleDelete(a.id)} style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
            Delete
          </button>
        </div>
      ))}
    </>
  );
}
