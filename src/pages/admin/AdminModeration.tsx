import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import { supabase } from "../../lib/supabase";

interface AdminModerationProps {
  path?: string;
}

interface ModeratedQuestion {
  id: string;
  body: string;
  created_at: string;
  hidden: boolean;
  attendees: { name: string | null } | null;
}

export default function AdminModeration(_props: AdminModerationProps) {
  return (
    <AdminGuard>
      <AdminModerationContent />
    </AdminGuard>
  );
}

function AdminModerationContent() {
  const [questions, setQuestions] = useState<ModeratedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    // Admins see hidden questions too (RLS: (NOT hidden) OR is_admin()).
    const { data, error } = await supabase
      .from("questions")
      .select("id, body, created_at, hidden, attendees(name)")
      .order("created_at", { ascending: false });
    if (error) console.error("Failed to load questions for moderation", error);
    setQuestions((data as unknown as ModeratedQuestion[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleHidden(q: ModeratedQuestion) {
    const { error } = await supabase.from("questions").update({ hidden: !q.hidden }).eq("id", q.id);
    if (error) {
      console.error("Failed to update question visibility", error);
      return;
    }
    await load();
  }

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Moderate Questions</h2>
      </section>

      {loading && <p>Loading…</p>}
      {!loading && questions.length === 0 && <p style={{ color: "var(--text-muted)" }}>No questions yet.</p>}

      {questions.map((q) => (
        <div class="card" key={q.id} style={{ opacity: q.hidden ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: 0 }}>{q.body}</p>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {q.attendees?.name || "Attendee"} · {q.hidden ? "Hidden" : "Visible"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleHidden(q)}
              style={{ padding: "6px 12px", whiteSpace: "nowrap" }}
            >
              {q.hidden ? "Unhide" : "Hide"}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
