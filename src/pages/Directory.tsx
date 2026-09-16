import { useEffect, useMemo, useState } from "preact/hooks";
import PageHero from "../components/PageHero";
import { attendee, authSession } from "../lib/auth";
import { COMPANY_TYPE_GROUPS, COMPANY_TYPE_LABELS } from "../lib/companyTypes";
import { supabase } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";

interface DirectoryProps {
  path?: string;
}

interface DirectoryEntry {
  id: string;
  name: string | null;
  company: string | null;
  company_type: string | null;
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
  const [companyTypeFilter, setCompanyTypeFilter] = useState("");

  useEffect(() => {
    trackEvent("view_directory");
  }, []);

  useEffect(() => {
    supabase
      .from("attendees")
      .select("id, name, company, company_type, job_title, job_function, focus_areas, photo_url, contact_opt_in, email")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Failed to load directory", error);
        setEntries((data as DirectoryEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = entries;
    if (companyTypeFilter) list = list.filter((e) => e.company_type === companyTypeFilter);
    if (needle) {
      list = list.filter((e) =>
        [e.name, e.company, e.company_type && COMPANY_TYPE_LABELS[e.company_type], e.job_title, e.job_function, ...(e.focus_areas ?? [])]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle))
      );
    }
    return list;
  }, [entries, q, companyTypeFilter]);

  if (!authSession.value || !attendee.value) {
    return (
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Attendees"
        subtitle={
          <>
            Verify your email to search attendees and connect with other attendees.{" "}
            <a href="/verify">Verify now</a>.
          </>
        }
      />
    );
  }

  return (
    <>
      <PageHero eyebrow="2026 QUE Group Conference" title="Attendees" />

      <section class="card">
        <input
          type="search"
          placeholder="Search by name, company, role, or focus area…"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        <select
          value={companyTypeFilter}
          onChange={(e) => setCompanyTypeFilter((e.target as HTMLSelectElement).value)}
          style={{ width: "100%", padding: 10 }}
        >
          <option value="">All company types</option>
          {COMPANY_TYPE_GROUPS.map((group) => (
            <optgroup label={group.label} key={group.label}>
              {group.options.map((opt) => (
                <option value={opt.value} key={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
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
              {e.company && (
                <div style={{ color: "var(--text-muted)" }}>
                  {e.company}
                  {e.company_type && COMPANY_TYPE_LABELS[e.company_type] && ` · ${COMPANY_TYPE_LABELS[e.company_type]}`}
                </div>
              )}
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
