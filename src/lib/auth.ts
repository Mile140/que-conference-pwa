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

/**
 * null = not yet checked (e.g. still loading auth state), false = checked
 * and not an admin, true = confirmed admin. Backed by the `is_admin()`
 * SECURITY DEFINER function (RLS policies already call it, and it's
 * intentionally callable by anon/authenticated -- see Supabase advisors)
 * rather than a direct `select from admins`, since that table has no
 * SELECT policy at all (default-deny, including for the admin's own row).
 */
export const isAdmin = signal<boolean | null>(null);

async function refreshAdminStatus() {
  if (!authSession.value) {
    isAdmin.value = false;
    return;
  }
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.error("Failed to check admin status", error);
    isAdmin.value = false;
    return;
  }
  isAdmin.value = data === true;
}

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
    if (data.session) {
      await Promise.all([refreshAttendee(), refreshAdminStatus()]);
    }
    authLoading.value = false;
  });

  supabase.auth.onAuthStateChange(async (_event, session) => {
    authSession.value = session;
    if (session) {
      await Promise.all([refreshAttendee(), refreshAdminStatus()]);
    } else {
      attendee.value = null;
      isAdmin.value = false;
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

/** Admin login (spec §3.13/D-decisions: email+password, separate from attendee OTP). */
export async function signInAdminPassword(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { error: error?.message ?? null };
}

export async function signOut() {
  await supabase.auth.signOut();
}
