import { useEffect, useMemo, useState } from "preact/hooks";
import PageHero from "../components/PageHero";
import { attendee, authSession } from "../lib/auth";
import { supabase } from "../lib/supabase";

interface DirectoryProps {
  path?: string;
}

interface DirectoryEntry {
  id: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  job_function: string | null;
  focus_areas: string[];
  photo_url: string | null;
  contact_opt_in: boolean;
  email: string;
}

/**
 * Searchable "who's here" directory (spec §3.5). RLS only returns the full
 * roster to verified attendees (is_speaker rows are separately public for
 * the Speakers page) -- guests hitting this route just see the verify
 * prompt below since the query legitimately returns nothing for them.
 */
export default function Directory(_props: DirectoryProps) {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("attendees")
      .select("id, name, company, job_title, job_function, focus_areas, photo_url, contact_opt_in, email")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Failed to load directory", error);
        setEntries((data as DirectoryEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) =>
      [e.name, e.company, e.job_title, e.job_function, ...(e.focus_areas ?? [])]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle))
    );
  }, [entries, q]);

  if (!authSession.value || !attendee.value) {
    return (
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Attendee directory"
        subtitle={
          <>
            Verify your email to search the directory and connect with other attendees.{" "}
            <a href="/verify">Verify now</a>.
          </>
        }
      />
    );
  }

  return (
    <>
      <PageHero eyebrow="2026 QUE Group Conference" title="Attendee directory" />

      <section class="card">
        <input
          type="search"
          placeholder="Search by name, company, role, or focus area…"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          style={{ width: "100%", padding: 10 }}
        />
      </section>

      {loading && <p>Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No matches.</p>
      )}

      {filtered.map((e) => (
        <div class="card" key={e.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div>
              <strong>{e.name || "(name pending)"}</strong>
              {e.company && <div style={{ color: "var(--text-muted)" }}>{e.company}</div>}
              {(e.job_title || e.job_function) && (
                <div style={{ color: "var(--text-muted)" }}>
                  {[e.job_title, e.job_function].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            {e.contact_opt_in && (
              <a href={`mailto:${e.email}`} style={{ whiteSpace: "nowrap" }}>
                Send email
              </a>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
