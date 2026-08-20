import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";

/**
 * Global admin toggles (spec §3.6/§3.8, `settings` table). Realtime-backed
 * so an admin flipping `feedback_enabled` or `questions_open` mid-conference
 * (via direct SQL until the Phase 7 admin console exists) takes effect for
 * anyone with the app open, no refresh needed.
 */
export interface AppSettings {
  feedback_enabled: boolean;
  questions_open: boolean;
  event_year: number;
}

const DEFAULTS: AppSettings = {
  feedback_enabled: true,
  questions_open: true,
  event_year: new Date().getFullYear(),
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.from("settings").select("key, value");
      if (cancelled) return;
      if (error) {
        console.error("Failed to load settings", error);
        setLoading(false);
        return;
      }
      const next = { ...DEFAULTS } as Record<string, unknown>;
      for (const row of data ?? []) next[row.key as string] = row.value;
      setSettings(next as unknown as AppSettings);
      setLoading(false);
    }

    load();
    const channel = supabase
      .channel("settings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}
