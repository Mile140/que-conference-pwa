import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";

/** Sponsors list + detail (spec §3.4). Public read (sponsors RLS allows all). */
export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  contact: string | null;
  sponsoring_text: string | null;
  display_order: number;
}

export interface SponsorSession {
  id: string;
  title: string;
  day: string;
  start: string;
  end: string;
  room: string | null;
}

export function useSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("sponsors")
      .select("*")
      .order("display_order", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load sponsors", error);
        setSponsors((data as Sponsor[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { sponsors, loading };
}

export function useSponsor(id: string | undefined) {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [sessions, setSessions] = useState<SponsorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      supabase.from("sponsors").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("sessions")
        .select("id, title, day, start, end, room")
        .eq("sponsor_id", id)
        .order("start", { ascending: true }),
    ]).then(([sponsorRes, sessionsRes]) => {
      if (cancelled) return;
      if (sponsorRes.error) console.error("Failed to load sponsor", sponsorRes.error);
      if (sessionsRes.error) console.error("Failed to load sponsor sessions", sessionsRes.error);
      if (!sponsorRes.data) setNotFound(true);
      setSponsor((sponsorRes.data as Sponsor) ?? null);
      setSessions((sessionsRes.data as SponsorSession[]) ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { sponsor, sessions, loading, notFound };
}
