import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";

/**
 * Venue/hotel/off-site maps (spec §3.11) -- uploaded images and/or text,
 * admin-editable. `type` is free text (e.g. "venue", "hotel", "offsite")
 * rather than an enum, so the UI just displays whatever value is set
 * without assuming a fixed set of categories.
 */
export interface VenueMap {
  id: string;
  title: string;
  image_url: string | null;
  description: string | null;
  type: string | null;
  sort: number;
}

export function useVenueMaps() {
  const [maps, setMaps] = useState<VenueMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("venue_maps")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load venue maps", error);
        setMaps((data as VenueMap[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { maps, loading };
}
