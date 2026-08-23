import { useEffect, useState } from "preact/hooks";
import { attendee } from "./auth";
import { supabase } from "./supabase";

/**
 * Usage tracking (spec §3.13 / Phase 8 follow-up). `analytics_events` has
 * existed unused since Phase 1: `event_type` is free text, `target_id` is an
 * optional uuid for linking a view to a specific row (a session, sponsor,
 * photo). RLS already allows anyone (including guests) to insert and only
 * admins to read -- see AdminStats.tsx for the read side.
 *
 * Deliberately fire-and-forget: a failed analytics insert should never
 * block or error out the page the attendee is actually trying to use.
 */
export function trackEvent(eventType: string, targetId?: string) {
  supabase
    .from("analytics_events")
    .insert({ event_type: eventType, target_id: targetId ?? null, attendee_id: attendee.value?.id ?? null })
    .then(({ error }) => {
      if (error) console.error(`Failed to track event "${eventType}"`, error);
    });
}

export interface UsageStats {
  attendeesTotal: number;
  attendeesVerified: number;
  questions: number;
  questionVotes: number;
  photos: number;
  photoComments: number;
  learningItems: number;
  sessionRatings: number;
  announcements: number;
  issueReportsTotal: number;
  issueReportsOpen: number;
  pageViews: { eventType: string; count: number }[];
  topSessions: { id: string; title: string; views: number }[];
  topSponsors: { id: string; name: string; views: number }[];
}

const PAGE_VIEW_LABELS: Record<string, string> = {
  view_home: "Now & Next",
  view_schedule: "Schedule",
  view_directory: "Directory",
  view_questions: "Questions",
  view_learning: "Learning list",
  view_speakers: "Speakers",
  view_sponsors: "Sponsors",
  view_maps: "Maps",
  view_info: "Info",
  view_photos: "Photo wall",
  view_feedback: "Feedback",
  view_session: "Session detail",
  view_sponsor: "Sponsor detail",
  view_photo: "Photo detail",
};

export function pageViewLabel(eventType: string): string {
  return PAGE_VIEW_LABELS[eventType] ?? eventType;
}

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c, error } = await q;
  if (error) console.error(`Failed to count ${table}`, error);
  return c ?? 0;
}

export function useUsageStats() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [
          attendeesTotal,
          attendeesVerified,
          questions,
          questionVotes,
          photos,
          photoComments,
          learningItems,
          sessionRatings,
          announcements,
          issueReportsTotal,
          issueReportsOpen,
          eventsRes,
        ] = await Promise.all([
          count("attendees"),
          count("attendees", (q) => q.not("auth_user_id", "is", null)),
          count("questions"),
          count("question_votes"),
          count("photos"),
          count("photo_comments"),
          count("learning_items"),
          count("feedback"),
          count("announcements"),
          count("issue_reports"),
          count("issue_reports", (q) => q.eq("resolved", false)),
          // Recent-first cap keeps this to a reasonable payload at this
          // event's scale (dozens of attendees) without needing a
          // server-side GROUP BY / aggregate view.
          supabase
            .from("analytics_events")
            .select("event_type, target_id")
            .order("created_at", { ascending: false })
            .limit(5000),
        ]);

        if (cancelled) return;
        if (eventsRes.error) console.error("Failed to load analytics events", eventsRes.error);

        const viewCounts = new Map<string, number>();
        const sessionViews = new Map<string, number>();
        const sponsorViews = new Map<string, number>();
        for (const e of eventsRes.data ?? []) {
          viewCounts.set(e.event_type, (viewCounts.get(e.event_type) ?? 0) + 1);
          if (e.event_type === "view_session" && e.target_id) {
            sessionViews.set(e.target_id, (sessionViews.get(e.target_id) ?? 0) + 1);
          }
          if (e.event_type === "view_sponsor" && e.target_id) {
            sponsorViews.set(e.target_id, (sponsorViews.get(e.target_id) ?? 0) + 1);
          }
        }

        const topSessionIds = [...sessionViews.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
        const topSponsorIds = [...sponsorViews.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);

        const [sessionRows, sponsorRows] = await Promise.all([
          topSessionIds.length
            ? supabase.from("sessions").select("id, title").in("id", topSessionIds)
            : Promise.resolve({ data: [] as { id: string; title: string }[] }),
          topSponsorIds.length
            ? supabase.from("sponsors").select("id, name").in("id", topSponsorIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        ]);
        if (cancelled) return;

        const sessionTitleById = new Map((sessionRows.data ?? []).map((s) => [s.id, s.title]));
        const sponsorNameById = new Map((sponsorRows.data ?? []).map((s) => [s.id, s.name]));

        setStats({
          attendeesTotal,
          attendeesVerified,
          questions,
          questionVotes,
          photos,
          photoComments,
          learningItems,
          sessionRatings,
          announcements,
          issueReportsTotal,
          issueReportsOpen,
          pageViews: [...viewCounts.entries()].map(([eventType, c]) => ({ eventType, count: c })).sort((a, b) => b.count - a.count),
          topSessions: topSessionIds.map((id) => ({ id, title: sessionTitleById.get(id) ?? "(deleted session)", views: sessionViews.get(id)! })),
          topSponsors: topSponsorIds.map((id) => ({ id, name: sponsorNameById.get(id) ?? "(deleted sponsor)", views: sponsorViews.get(id)! })),
        });
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load usage stats", err);
        setError(err instanceof Error ? err.message : "Failed to load usage stats.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}
