import { useEffect, useState } from "preact/hooks";
import { attendee } from "./auth";
import { supabase } from "./supabase";

/**
 * Personal agenda (spec §3.2/D7). Reminders (push notifications before a
 * session starts) are stored via `agenda_items.remind` but not yet acted on
 * -- push infrastructure is Phase 4. For now this is just "my schedule."
 */
export function useAgenda() {
  const [sessionIds, setSessionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    const a = attendee.value;
    if (!a) {
      setSessionIds(new Set());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("agenda_items")
      .select("session_id")
      .eq("attendee_id", a.id);
    if (error) console.error("Failed to load agenda", error);
    setSessionIds(new Set((data ?? []).map((r) => r.session_id as string)));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [attendee.value?.id]);

  async function toggle(sessionId: string) {
    const a = attendee.value;
    if (!a) return;
    const inAgenda = sessionIds.has(sessionId);
    if (inAgenda) {
      const { error } = await supabase
        .from("agenda_items")
        .delete()
        .eq("attendee_id", a.id)
        .eq("session_id", sessionId);
      if (error) {
        console.error("Failed to remove from agenda", error);
        return;
      }
    } else {
      const { error } = await supabase
        .from("agenda_items")
        .insert({ attendee_id: a.id, session_id: sessionId });
      if (error) {
        console.error("Failed to add to agenda", error);
        return;
      }
    }
    await load();
  }

  return { sessionIds, loading, toggle };
}
