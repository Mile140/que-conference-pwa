import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";

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

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("info_pages")
      .select("*")
      .order("sort", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load info pages", error);
        setPages((data as InfoPage[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { pages, loading };
}
