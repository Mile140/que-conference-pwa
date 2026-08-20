import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";

/**
 * Speakers page (spec §3.3) -- attendees flagged `is_speaker`, no separate
 * list to keep in sync. Public read: the `attendees` RLS policy already
 * allows `is_speaker = true` rows through for guests.
 *
 * Linked sessions come through the `session_speakers` join table (existed
 * in the schema from Phase 1, unused until now). If a speaker is also a
 * sponsor contact (`attendees.sponsor_id`), their entry links to that
 * sponsor's detail page.
 */
export interface SpeakerSession {
  id: string;
  title: string;
  day: string;
  start: string;
  end: string;
  room: string | null;
}

export interface Speaker {
  id: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  photo_url: string | null;
  bio: string | null;
  sponsor_id: string | null;
  sponsors: { id: string; name: string } | null;
  session_speakers: { sessions: SpeakerSession }[];
}

export function useSpeakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("attendees")
      .select(
        "id, name, company, job_title, photo_url, bio, sponsor_id, sponsors(id, name), session_speakers(sessions(id, title, day, start, end, room))"
      )
      .eq("is_speaker", true)
      .order("name", { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          console.error("Failed to load speakers", err);
          setError(err.message);
        }
        setSpeakers((data as unknown as Speaker[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { speakers, loading, error };
}
