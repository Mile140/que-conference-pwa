import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";
import { getCached, setCached } from "./offlineCache";

const CACHE_KEY = "info_pages";

/**
 * Admin-editable static info pages (spec §3.12) -- wifi, hotel parking,
 * local attractions, and whatever else the admin adds. RLS only returns
 * `published = true` rows to non-admins, so unpublished drafts stay hidden
 * without any client-side filtering needed here.
 */
export interface InfoPage {
  id: string;
  title: string;
  body: string | null;
  sort: number;
  published: boolean;
}

export function useInfoPages() {
  const [pages, setPages] = useState<InfoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("info_pages")
      .select("*")
      .order("sort", { ascending: true })
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to load info pages", error);
          const cached = await getCached<InfoPage[]>(CACHE_KEY);
          if (cancelled) return;
          if (cached) {
            setPages(cached);
            setStale(true);
          }
        } else {
          const rows = (data as InfoPage[]) ?? [];
          setPages(rows);
          setStale(false);
          setCached(CACHE_KEY, rows);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { pages, loading, stale };
}
