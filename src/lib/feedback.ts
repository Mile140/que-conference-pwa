import { useEffect, useState } from "preact/hooks";
import { attendee } from "./auth";
import { supabase } from "./supabase";

/**
 * Session feedback (spec §3.8) -- one 1-5 rating per attendee per session,
 * enforced by the `feedback(session_id, attendee_id)` primary key. Upsert
 * so re-rating just overwrites. Gated in the UI by `settings.feedback_enabled`
 * (see useSettings), not here -- this hook just reads/writes the rating.
 */
export function useFeedback(sessionId: string | undefined) {
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const a = attendee.value;
    if (!sessionId || !a) {
      setRating(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("feedback")
      .select("rating")
      .eq("session_id", sessionId)
      .eq("attendee_id", a.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load feedback", error);
        setRating((data?.rating as number | undefined) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, attendee.value?.id]);

  async function rate(value: number) {
    const a = attendee.value;
    if (!sessionId || !a) return;
    const { error } = await supabase
      .from("feedback")
      .upsert(
        { session_id: sessionId, attendee_id: a.id, rating: value },
        { onConflict: "session_id,attendee_id" }
      );
    if (error) {
      console.error("Failed to save feedback", error);
      return;
    }
    setRating(value);
  }

  return { rating, loading, rate };
}
