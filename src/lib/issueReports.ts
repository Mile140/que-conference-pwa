import { attendee } from "./auth";
import { supabase } from "./supabase";

/**
 * Private "report an issue" inbox (added ahead of go-live so attendees have
 * a direct line to the organizers during the conference -- app bugs, room
 * mix-ups, anything). One-way: attendees submit, only admins read/resolve
 * (see AdminFeedback.tsx). No self-read-back UI, so no select policy for
 * attendees in RLS -- this isn't a two-way thread, just an inbox.
 */
export async function submitIssueReport(body: string): Promise<{ error: string | null }> {
  const a = attendee.value;
  if (!a) return { error: "Verify your email first." };
  const trimmed = body.trim();
  if (!trimmed) return { error: "Description can't be empty." };
  const { error } = await supabase.from("issue_reports").insert({ attendee_id: a.id, body: trimmed });
  return { error: error?.message ?? null };
}
