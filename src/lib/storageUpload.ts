import { supabase } from "./supabase";

/**
 * Shared image upload helper for admin forms (sponsor logos, venue maps,
 * speaker photos). All target buckets (`sponsor-logos`, `maps`, `avatars`)
 * are public-read with an admin-all storage policy, so an authenticated
 * admin can upload directly from the browser -- no separate "upload in the
 * Supabase dashboard, then paste the URL" step needed.
 */
export async function uploadImage(bucket: string, file: File): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
