import { useCallback, useEffect, useState } from "preact/hooks";
import { attendee } from "./auth";
import { supabase } from "./supabase";
import { compressImage } from "./imageCompress";

/**
 * Photo wall (spec §3.9). Public read (RLS: `(NOT hidden) OR is_admin()`),
 * verified-attendee post + comment, admin hide/remove.
 *
 * Every `attendees` embed below uses an explicit FK hint
 * (`attendees!photos_attendee_id_fkey` etc.) rather than plain
 * `attendees(name)` -- `photo_comments` has FKs to both `photos` and
 * `attendees`, which creates an implicit many-to-many bridge on top of the
 * direct FK, and PostgREST returns an ambiguous-relationship error (HTTP
 * 300, silently empty in the UI) without the hint. Same issue bit the
 * Questions page in Phase 7; hint everywhere now rather than rediscovering
 * it table by table.
 *
 * RLS lets admins see hidden rows too (needed for moderation), but that
 * would make public pages show a different picture depending on who's
 * signed in. Both hooks below filter `hidden` client-side regardless of
 * viewer role, same fix applied to the public Questions page.
 */
export interface PhotoRow {
  id: string;
  attendee_id: string;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  created_at: string;
  hidden: boolean;
  attendees: { name: string | null } | null;
}

export interface PhotoCommentRow {
  id: string;
  photo_id: string;
  attendee_id: string;
  body: string;
  created_at: string;
  hidden: boolean;
  attendees: { name: string | null } | null;
}

async function uploadBlob(bucket: string, blob: Blob, ext: string): Promise<{ url: string | null; error: string | null }> {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || "image/jpeg",
  });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export function usePhotos() {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("photos")
      .select("*, attendees!photos_attendee_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (err) console.error("Failed to load photos", err);
    setError(err?.message ?? null);
    setPhotos(((data as PhotoRow[]) ?? []).filter((p) => !p.hidden));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("photos-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { photos, loading, error };
}

/** Uploads a full + thumbnail variant and inserts the `photos` row. */
export async function submitPhoto(file: File, caption: string): Promise<{ error: string | null }> {
  const a = attendee.value;
  if (!a) return { error: "Verify your email first." };

  let fullBlob: Blob, thumbBlob: Blob;
  try {
    [fullBlob, thumbBlob] = await Promise.all([
      compressImage(file, 1600, 500_000),
      compressImage(file, 480, 150_000),
    ]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to process image." };
  }

  const { url: imageUrl, error: uploadErr } = await uploadBlob("photos", fullBlob, "jpg");
  if (uploadErr) return { error: uploadErr };
  const { url: thumbUrl, error: thumbErr } = await uploadBlob("photos", thumbBlob, "jpg");
  if (thumbErr) return { error: thumbErr };

  const { error: insertErr } = await supabase.from("photos").insert({
    attendee_id: a.id,
    image_url: imageUrl,
    thumbnail_url: thumbUrl,
    caption: caption.trim() || null,
  });
  return { error: insertErr?.message ?? null };
}

export function usePhotoDetail(photoId: string | undefined) {
  const [photo, setPhoto] = useState<PhotoRow | null>(null);
  const [comments, setComments] = useState<PhotoCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!photoId) return;
    setLoading(true);
    setNotFound(false);
    const [photoRes, commentsRes] = await Promise.all([
      supabase.from("photos").select("*, attendees!photos_attendee_id_fkey(name)").eq("id", photoId).maybeSingle(),
      supabase
        .from("photo_comments")
        .select("*, attendees!photo_comments_attendee_id_fkey(name)")
        .eq("photo_id", photoId)
        .order("created_at", { ascending: true }),
    ]);
    if (photoRes.error) console.error("Failed to load photo", photoRes.error);
    if (commentsRes.error) console.error("Failed to load comments", commentsRes.error);
    const p = (photoRes.data as PhotoRow | null) ?? null;
    if (!p || p.hidden) setNotFound(true);
    setPhoto(p && !p.hidden ? p : null);
    setComments(((commentsRes.data as PhotoCommentRow[]) ?? []).filter((c) => !c.hidden));
    setLoading(false);
  }, [photoId]);

  useEffect(() => {
    load();
    if (!photoId) return;
    const channel = supabase
      .channel(`photo-${photoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_comments", filter: `photo_id=eq.${photoId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, photoId]);

  return { photo, comments, loading, notFound };
}

export async function submitComment(photoId: string, body: string): Promise<{ error: string | null }> {
  const a = attendee.value;
  if (!a) return { error: "Verify your email first." };
  const trimmed = body.trim();
  if (!trimmed) return { error: "Comment can't be empty." };
  const { error } = await supabase.from("photo_comments").insert({ photo_id: photoId, attendee_id: a.id, body: trimmed });
  return { error: error?.message ?? null };
}
