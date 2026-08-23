import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import PageHero from "../../components/PageHero";
import { supabase } from "../../lib/supabase";

interface AdminFeedbackProps {
  path?: string;
}

interface IssueReportRow {
  id: string;
  body: string;
  created_at: string;
  resolved: boolean;
  attendees: { name: string | null; email: string } | null;
}

export default function AdminFeedback(_props: AdminFeedbackProps) {
  return (
    <AdminGuard>
      <AdminFeedbackContent />
    </AdminGuard>
  );
}

function AdminFeedbackContent() {
  const [reports, setReports] = useState<IssueReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  async function load() {
    // "attendees!issue_reports_attendee_id_fkey" hints the FK explicitly --
    // same defensive habit used everywhere else an attendee is embedded,
    // even though issue_reports only has the one FK path to attendees.
    const { data, error: err } = await supabase
      .from("issue_reports")
      .select("id, body, created_at, resolved, attendees!issue_reports_attendee_id_fkey(name, email)")
      .order("created_at", { ascending: false });
    if (err) console.error("Failed to load issue reports", err);
    setError(err?.message ?? null);
    setReports((data as unknown as IssueReportRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleResolved(r: IssueReportRow) {
    const { error: err } = await supabase.from("issue_reports").update({ resolved: !r.resolved }).eq("id", r.id);
    if (err) {
      console.error("Failed to update issue report", err);
      return;
    }
    await load();
  }

  const visible = reports.filter((r) => showResolved || !r.resolved);

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Feedback"
        subtitle="Private reports attendees sent straight to the organizers."
      />

      <section class="card">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved((e.target as HTMLInputElement).checked)} />
          Show resolved
        </label>
      </section>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Couldn't load feedback: {error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Nothing here.</p>
      )}

      {visible.map((r) => (
        <div class="card" key={r.id} style={{ opacity: r.resolved ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{r.body}</p>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {r.attendees?.name || "Attendee"}
                {r.attendees?.email ? ` · ${r.attendees.email}` : ""} · {new Date(r.created_at).toLocaleString()}
                {r.resolved ? " · Resolved" : ""}
              </div>
            </div>
            <button type="button" onClick={() => toggleResolved(r)} style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
              {r.resolved ? "Reopen" : "Resolve"}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
