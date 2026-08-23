import { useEffect, useState } from "preact/hooks";
import RouterLink from "../components/RouterLink";
import PageHero from "../components/PageHero";
import { attendee, authSession } from "../lib/auth";
import { isOnline } from "../lib/network";
import { trackEvent } from "../lib/analytics";
import { usePhotos, submitPhoto } from "../lib/photos";

interface PhotosProps {
  path?: string;
}

export default function Photos(_props: PhotosProps) {
  const { photos, loading, error } = usePhotos();
  const verified = authSession.value && attendee.value;
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    trackEvent("view_photos");
  }, []);

  return (
    <>
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Photo wall"
        subtitle={
          !verified ? (
            <>
              <a href="/verify">Verify your email</a> to post photos and comments.
            </>
          ) : undefined
        }
        action={
          verified && (
            <button
              type="button"
              class="hero-action"
              onClick={() => setShowForm((v) => !v)}
              aria-label={showForm ? "Cancel" : "Add photo"}
              title={showForm ? "Cancel" : "Add photo"}
            >
              {showForm ? "✕" : "+"}
            </button>
          )
        }
      >
        {showForm && verified && <PhotoUploadForm onDone={() => setShowForm(false)} />}
      </PageHero>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Couldn't load photos: {error}</p>}
      {!loading && !error && photos.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No photos yet — be the first to post one.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {photos.map((p) => {
          const mine = attendee.value?.id === p.attendee_id;
          return (
            <RouterLink href={`/photos/${p.id}`} key={p.id} style={{ display: "block" }}>
              <img
                src={p.thumbnail_url || p.image_url}
                alt={p.caption ?? "Conference photo"}
                title={mine ? "Your photo" : undefined}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  borderRadius: 8,
                  border: mine ? "2px solid var(--brand-highlight)" : "none",
                }}
              />
            </RouterLink>
          );
        })}
      </div>
    </>
  );
}

function PhotoUploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    if (!isOnline.value) {
      setError("You're offline — reconnect to post a photo.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await submitPhoto(file, caption);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setFile(null);
    setCaption("");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0] ?? null)}
      />
      <input
        type="text"
        placeholder="Caption (optional)"
        value={caption}
        onInput={(e) => setCaption((e.target as HTMLInputElement).value)}
        style={{ padding: 8 }}
      />
      {error && <p style={{ color: "#ffb4b4", margin: 0 }}>{error}</p>}
      <button type="submit" class="btn-gold" disabled={submitting || !file || !isOnline.value} style={{ alignSelf: "flex-start" }}>
        {submitting ? "Compressing & uploading…" : isOnline.value ? "Post photo" : "Offline"}
      </button>
    </form>
  );
}
