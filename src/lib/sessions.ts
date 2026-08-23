import { useEffect, useState } from "preact/hooks";
import { supabase } from "./supabase";
import { getCached, setCached } from "./offlineCache";

const CACHE_KEY = "sessions";

export type SessionType =
  | "keynote"
  | "lightning_tip"
  | "hands_on_lab"
  | "panel"
  | "general_session"
  | "meal_break";

export const TYPE_LABELS: Record<SessionType, string> = {
  keynote: "Keynote",
  lightning_tip: "Lightning Tip",
  hands_on_lab: "Hands-On Lab",
  panel: "Panel",
  general_session: "General Session",
  meal_break: "Meal / Break",
};

export interface Session {
  id: string;
  title: string;
  day: string; // date, e.g. "2026-09-16"
  start: string; // timestamptz ISO string
  end: string; // timestamptz ISO string
  room: string | null;
  track: string | null;
  type: SessionType;
  description: string | null;
  materials_url: string | null;
  lab_notes: string | null;
  presenter_text: string | null;
  sponsor_id: string | null;
  sort: number;
}

// The conference runs in San Diego -- Now & Next and all displayed times
// should always read as venue-local time, regardless of what timezone the
// viewer's own device thinks it's in (someone traveling with a phone still
// set to their home timezone shouldn't see the wrong "now").
const VENUE_TIMEZONE = "America/Los_Angeles";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: VENUE_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: VENUE_TIMEZONE,
  weekday: "long",
  month: "short",
  day: "numeric",
});

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatTimeRange(session: { start: string; end: string }): string {
  return `${formatTime(session.start)} – ${formatTime(session.end)}`;
}

export function formatDay(dayIso: string): string {
  // dayIso is a plain date ("2026-09-16"); construct at noon UTC to avoid
  // any chance of the date itself shifting a calendar day under conversion.
  return dayFormatter.format(new Date(`${dayIso}T12:00:00Z`));
}

/**
 * Converts a `<input type="datetime-local">` value (a naive "wall clock"
 * string, no timezone) into a full ISO 8601 string with the correct venue
 * (Pacific) UTC offset explicitly attached -- the same footgun the original
 * SQL import guarded against with `AT TIME ZONE 'America/Los_Angeles'`.
 * Without an explicit offset, Postgres would interpret the naive string as
 * UTC, silently shifting every admin-entered time by 7-8 hours.
 */
export function pacificWallTimeToISO(localDateTime: string): string {
  const guess = new Date(`${localDateTime}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VENUE_TIMEZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(guess);
  const offsetName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-8";
  const match = offsetName.match(/GMT([+-]\d+)/);
  const offsetHours = match ? parseInt(match[1], 10) : -8;
  const sign = offsetHours <= 0 ? "-" : "+";
  const abs = Math.abs(offsetHours).toString().padStart(2, "0");
  return `${localDateTime}:00${sign}${abs}:00`;
}

/** Inverse of pacificWallTimeToISO -- for populating a datetime-local input from a stored ISO string. */
export function isoToPacificDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function groupByDay(sessions: Session[]): Array<{ day: string; sessions: Session[] }> {
  const groups = new Map<string, Session[]>();
  for (const s of sessions) {
    if (!groups.has(s.day)) groups.set(s.day, []);
    groups.get(s.day)!.push(s);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, sessions]) => ({ day, sessions }));
}

/**
 * Absolute-instant comparisons (start/end are timestamptz) work correctly
 * regardless of the viewer's device timezone -- `now` and `session.start`
 * both represent the same real moment everywhere. Timezone only matters for
 * *display* formatting (formatTime/formatDay above), not for this ordering.
 */
export function partitionNowNext(sessions: Session[], now: Date) {
  const nowMs = now.getTime();
  const current = sessions.filter(
    (s) => new Date(s.start).getTime() <= nowMs && nowMs < new Date(s.end).getTime()
  );
  const upcoming = sessions
    .filter((s) => new Date(s.start).getTime() > nowMs)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const nextStart = upcoming[0]?.start;
  const next = nextStart ? upcoming.filter((s) => s.start === nextStart) : [];
  return { current, next };
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("start", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load sessions", error);
        // Offline (or otherwise unreachable) -- fall back to whatever we
        // cached from the last successful load instead of showing an error.
        const cached = await getCached<Session[]>(CACHE_KEY);
        if (cancelled) return;
        if (cached) {
          setSessions(cached);
          setStale(true);
          setError(null);
        } else {
          setError(error.message);
        }
      } else {
        const rows = (data as Session[]) ?? [];
        setSessions(rows);
        setStale(false);
        setError(null);
        setCached(CACHE_KEY, rows);
      }
      setLoading(false);
    }
    load();

    // Sessions/materials/rooms can change live (admin edits, room
    // reassignments) -- keep the schedule in sync without a manual refresh.
    const channel = supabase
      .channel("sessions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { sessions, loading, error, stale };
}
