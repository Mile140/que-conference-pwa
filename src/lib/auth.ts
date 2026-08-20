import { signal } from "@preact/signals";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface Attendee {
  id: string;
  auth_user_id: string | null;
  email: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  job_function: string | null;
  focus_areas: string[];
  photo_url: string | null;
  bio: string | null;
  is_speaker: boolean;
  is_sponsor_contact: boolean;
  contact_opt_in: boolean;
  verified_at: string | null;
}

export const authSession = signal<Session | null>(null);
export const attendee = signal<Attendee | null>(null);
export const authLoading = signal(true);

/** True once we have both a live Supabase auth session and a linked attendees row. */
export function isVerified(): boolean {
  return authSession.value !== null && attendee.value !== null;
}

/**
 * Profile is "complete enough" once they have a name and at least a job
 * title -- used to prompt a first-time verified attendee to fill in the
 * directory-relevant fields Eventbrite never collected.
 */
export function isProfileComplete(a: Attendee | null): boolean {
  return !!a && !!a.name && !!a.job_title;
}

/**
 * After a session appears (fresh OTP verification, or an existing session
 * resuming on app load), find or create the matching attendees row:
 *   1. Already linked (auth_user_id = my uid)?
 *   2. A pre-imported row with this email, unclaimed? Claim it.
 *   3. Neither? Create a fresh row (walk-in, not in the Eventbrite export).
 */
async function ensureAttendeeRecord(session: Session): Promise<Attendee | null> {
  const uid = session.user.id;
  const email = session.user.email;
  if (!email) return null;

  const { data: existing } = await supabase
    .from("attendees")
    .select("*")
    .eq("auth_user_id", uid)
    .maybeSingle();
  if (existing) return existing as Attendee;

  const { data: claimed, error: claimError } = await supabase
    .from("attendees")
    .update({ auth_user_id: uid, verified_at: new Date().toISOString() })
    .eq("email", email.toLowerCase())
    .is("auth_user_id", null)
    .select("*")
    .maybeSingle();
  if (claimError) console.error("Failed to claim attendee row", claimError);
  if (claimed) return claimed as Attendee;

  const { data: created, error: createError } = await supabase
    .from("attendees")
    .insert({
      auth_user_id: uid,
      email: email.toLowerCase(),
      verified_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle();
  if (createError) console.error("Failed to create attendee row", createError);
  return (created as Attendee) ?? null;
}

export async function refreshAttendee() {
  const session = authSession.value;
  if (!session) {
    attendee.value = null;
    return;
  }
  attendee.value = await ensureAttendeeRecord(session);
}

export function initAuth() {
  supabase.auth.getSession().then(async ({ data }) => {
    authSession.value = data.session;
    if (data.session) await refreshAttendee();
    authLoading.value = false;
  });

  supabase.auth.onAuthStateChange(async (_event, session) => {
    authSession.value = session;
    if (session) {
      await refreshAttendee();
    } else {
      attendee.value = null;
    }
  });
}

export async function sendLoginCode(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  return { error: error?.message ?? null };
}

export async function verifyLoginCode(
  email: string,
  token: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email",
  });
  return { error: error?.message ?? null };
}

export async function signOut() {
  await supabase.auth.signOut();
}
