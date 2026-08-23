import { useEffect, useState } from "preact/hooks";
import { attendee, authSession } from "../lib/auth";
import { isOnline } from "../lib/network";
import { trackEvent } from "../lib/analytics";
import { usePhotoDetail, submitComment } from "../lib/photos";

interface PhotoDetailProps {
  path?: string;
  id?: string; // populated by preact-router from the :id route param
}

export default function PhotoDetail({ id }: PhotoDetailProps) {
  const { photo, comments, loading, notFound } = usePhotoDetail(id);
  const verified = authSession.value && attendee.value;
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) trackEvent("view_photo", id);
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (notFound || !photo) return <p>Photo not found.</p>;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    if (!isOnline.value) {
      setError("You're offline — reconnect to post a comment.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await submitComment(photo!.id, body);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setBody("");
  }

  return (
    <>
      <article class="card">
        <img src={photo.image_url} alt={photo.caption ?? ""} style={{ width: "100%", borderRadius: 8 }} />
        {photo.caption && <p style={{ marginBottom: 4 }}>{photo.caption}</p>}
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {photo.attendees?.name || "Attendee"} · {new Date(photo.created_at).toLocaleString()}
        </div>
      </article>

      <section class="card">
        <h3 style={{ marginTop: 0 }}>Comments</h3>
        {comments.length === 0 && <p style={{ color: "var(--text-muted)" }}>No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ marginBottom: 10 }}>
            <p style={{ margin: 0 }}>{c.body}</p>
            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{c.attendees?.name || "Attendee"}</div>
          </div>
        ))}

        {verified ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <textarea
              value={body}
              onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
              placeholder="Add a comment…"
              rows={2}
              style={{ padding: 8, resize: "vertical" }}
            />
            {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
            <button type="submit" class="btn-gold" disabled={submitting || !body.trim() || !isOnline.value} style={{ alignSelf: "flex-start" }}>
              {submitting ? "Posting…" : isOnline.value ? "Post comment" : "Offline"}
            </button>
          </form>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>
            <a href="/verify">Verify your email</a> to comment.
          </p>
        )}
      </section>
    </>
  );
}
