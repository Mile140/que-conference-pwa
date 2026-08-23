import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";
import { getCached, setCached } from "./offlineCache";

const CACHE_KEY = "venue_maps";

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
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("venue_maps")
      .select("*")
      .order("sort", { ascending: true })
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load venue maps", error);
          const cached = await getCached<VenueMap[]>(CACHE_KEY);
          if (cancelled) return;
          if (cached) {
            setMaps(cached);
            setStale(true);
          }
        } else {
          const rows = (data as VenueMap[]) ?? [];
          setMaps(rows);
          setStale(false);
          setCached(CACHE_KEY, rows);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { maps, loading, stale };
}
