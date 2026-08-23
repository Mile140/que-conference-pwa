import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import { supabase } from "../../lib/supabase";
import type { PhotoRow, PhotoCommentRow } from "../../lib/photos";

interface AdminPhotosProps {
  path?: string;
}

export default function AdminPhotos(_props: AdminPhotosProps) {
  return (
    <AdminGuard>
      <AdminPhotosContent />
    </AdminGuard>
  );
}

function AdminPhotosContent() {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    // Admins see hidden photos too (RLS: (NOT hidden) OR is_admin()).
    const { data, error: err } = await supabase
      .from("photos")
      .select("*, attendees!photos_attendee_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (err) console.error("Failed to load photos for moderation", err);
    setError(err?.message ?? null);
    setPhotos((data as PhotoRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePhotoHidden(p: PhotoRow) {
    const { error: err } = await supabase.from("photos").update({ hidden: !p.hidden }).eq("id", p.id);
    if (err) {
      console.error("Failed to update photo visibility", err);
      return;
    }
    await load();
  }

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Moderate Photos</h2>
      </section>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Couldn't load photos: {error}</p>}
      {!loading && !error && photos.length === 0 && <p style={{ color: "var(--text-muted)" }}>No photos yet.</p>}

      {photos.map((p) => (
        <div class="card" key={p.id} style={{ opacity: p.hidden ? 0.6 : 1 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <img src={p.thumbnail_url || p.image_url} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {p.caption && <p style={{ margin: 0 }}>{p.caption}</p>}
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {p.attendees?.name || "Attendee"} · {p.hidden ? "Hidden" : "Visible"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => togglePhotoHidden(p)} style={{ padding: "6px 12px" }}>
                  {p.hidden ? "Unhide" : "Hide"}
                </button>
                <button type="button" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={{ padding: "6px 12px" }}>
                  {expandedId === p.id ? "Hide comments" : "Comments"}
                </button>
              </div>
            </div>
          </div>
          {expandedId === p.id && <PhotoComments photoId={p.id} />}
        </div>
      ))}
    </>
  );
}

function PhotoComments({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<PhotoCommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("photo_comments")
      .select("*, attendees!photo_comments_attendee_id_fkey(name)")
      .eq("photo_id", photoId)
      .order("created_at", { ascending: true });
    if (error) console.error("Failed to load comments", error);
    setComments((data as PhotoCommentRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [photoId]);

  async function toggleCommentHidden(c: PhotoCommentRow) {
    const { error } = await supabase.from("photo_comments").update({ hidden: !c.hidden }).eq("id", c.id);
    if (error) {
      console.error("Failed to update comment visibility", error);
      return;
    }
    await load();
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border, #ddd)" }}>
      {loading && <p style={{ margin: 0 }}>Loading comments…</p>}
      {!loading && comments.length === 0 && <p style={{ color: "var(--text-muted)", margin: 0 }}>No comments.</p>}
      {comments.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 8, opacity: c.hidden ? 0.6 : 1 }}>
          <div>
            <p style={{ margin: 0 }}>{c.body}</p>
            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {c.attendees?.name || "Attendee"} · {c.hidden ? "Hidden" : "Visible"}
            </div>
          </div>
          <button type="button" onClick={() => toggleCommentHidden(c)} style={{ padding: "4px 10px", whiteSpace: "nowrap" }}>
            {c.hidden ? "Unhide" : "Hide"}
          </button>
        </div>
      ))}
    </div>
  );
}
