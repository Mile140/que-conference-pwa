import { attendee } from "./auth";
import { supabase } from "./supabase";

/**
 * Private "report an issue" inbox (added ahead of go-live so attendees have
 * a direct line to the organizers during the conference -- app bugs, room
 * mix-ups, anything). One-way: attendees submit, only admins read/resolve
 * (see AdminFeedback.tsx). No self-read-back UI, so no select policy for
 * attendees in RLS -- this isn't a two-way thread, just an inbox.
 *
 * Deliberately open to unverified/anonymous visitors too (a guest with app
 * trouble may not be able to verify in the first place, e.g. if verification
 * itself is what's broken) -- `attendee_id` is nullable, and guest_name/
 * guest_email are optional free-text fields the sender can fill in so an
 * admin has some way to follow up. See the issue_reports_insert_guest RLS
 * policy (anon + authenticated, attendee_id is null) alongside the original
 * issue_reports_insert_own policy for verified attendees.
 */
export async function submitIssueReport(
  body: string,
  guest?: { name?: string; email?: string }
): Promise<{ error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Description can't be empty." };

  // One consistent object shape (every field always present, just null when
  // not applicable) rather than two differently-shaped branches -- passing
  // a union of two object types to an untyped `.insert()` call confuses
  // postgrest-js's structural inference (it validates against whichever
  // branch it infers first and rejects the other as excess/mismatched).
  const a = attendee.value;
  const payload: {
    attendee_id: string | null;
    body: string;
    guest_name: string | null;
    guest_email: string | null;
  } = {
    attendee_id: a?.id ?? null,
    body: trimmed,
    guest_name: a ? null : guest?.name?.trim() || null,
    guest_email: a ? null : guest?.email?.trim() || null,
  };

  const { error } = await supabase.from("issue_reports").insert(payload);
  return { error: error?.message ?? null };
}
