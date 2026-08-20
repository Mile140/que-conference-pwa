import { useCallback, useEffect, useState } from "preact/hooks";
import { attendee } from "./auth";
import { supabase } from "./supabase";

/**
 * Personal learning list (spec §3.7) -- fully private per attendee, RLS
 * enforces `attendee_id = current_attendee_id()` on every operation.
 */
export interface LearningItem {
  id: string;
  attendee_id: string;
  title: string;
  notes: string | null;
  done: boolean;
  created_at: string;
  updated_at: string;
}

export function useLearningList() {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const a = attendee.value;
    if (!a) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("learning_items")
      .select("*")
      .eq("attendee_id", a.id)
      .order("created_at", { ascending: true });
    if (error) console.error("Failed to load learning list", error);
    setItems((data as LearningItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, attendee.value?.id]);

  async function addItem(title: string) {
    const a = attendee.value;
    const trimmed = title.trim();
    if (!a || !trimmed) return;
    const { error } = await supabase.from("learning_items").insert({ attendee_id: a.id, title: trimmed });
    if (error) console.error("Failed to add learning item", error);
    await load();
  }

  async function updateItem(id: string, patch: Partial<Pick<LearningItem, "title" | "notes" | "done">>) {
    const { error } = await supabase
      .from("learning_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("Failed to update learning item", error);
    await load();
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("learning_items").delete().eq("id", id);
    if (error) console.error("Failed to delete learning item", error);
    await load();
  }

  return { items, loading, addItem, updateItem, removeItem };
}
