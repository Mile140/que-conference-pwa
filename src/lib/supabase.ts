import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Fail loudly in dev rather than silently hitting undefined endpoints.
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Attendee auth is passwordless email OTP (Phase 3). Persist the session
    // so a verified attendee stays signed in across app launches/offline use.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
