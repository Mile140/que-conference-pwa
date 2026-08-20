import { useState } from "preact/hooks";
import { attendee, authSession } from "../lib/auth";
import { useQuestions } from "../lib/questions";
import { useSettings } from "../lib/settings";

interface QuestionsProps {
  path?: string;
}

/** Day-3 discussion questions (spec §3.6): public read, verified submit + upvote. */
export default function Questions(_props: QuestionsProps) {
  const { questions, voteCounts, myVotes, loading, submit, toggleVote } = useQuestions();
  const { settings } = useSettings();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const verified = authSession.value && attendee.value;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await submit(body);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setBody("");
  }

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0 }}>Day-3 Discussion Questions</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          Submit what you want covered in the group discussion, and upvote what others have asked
          so the moderator knows what matters most.
        </p>

        {!verified && (
          <p style={{ color: "var(--text-muted)" }}>
            <a href="/verify">Verify your email</a> to submit a question or upvote.
          </p>
        )}

        {verified && !settings.questions_open && (
          <p style={{ color: "var(--text-muted)" }}>Question submission is currently closed.</p>
        )}

        {verified && settings.questions_open && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={body}
              onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
              placeholder="What do you want the group to cover?"
              rows={3}
              style={{ padding: 10, resize: "vertical" }}
            />
            {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
            <button type="submit" disabled={submitting || !body.trim()} style={{ alignSelf: "flex-start", padding: "8px 14px" }}>
              {submitting ? "Submitting…" : "Submit question"}
            </button>
          </form>
        )}
      </section>

      {loading && <p>Loading questions…</p>}
      {!loading && questions.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No questions submitted yet.</p>
      )}

      {questions.map((q) => {
        const mine = myVotes.has(q.id);
        return (
          <div class="card" key={q.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0 }}>{q.body}</p>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {q.attendees?.name || "Attendee"}
              </div>
            </div>
            <button
              type="button"
              disabled={!verified}
              onClick={() => toggleVote(q.id)}
              title={verified ? (mine ? "Remove upvote" : "Upvote") : "Verify to upvote"}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "6px 12px",
                background: mine ? "var(--brand-accent)" : "transparent",
                color: mine ? "var(--white)" : "var(--text)",
                border: "1px solid var(--brand-accent)",
                borderRadius: 6,
                minWidth: 48,
              }}
            >
              <span>▲</span>
              <span>{voteCounts.get(q.id) ?? 0}</span>
            </button>
          </div>
        );
      })}
    </>
  );
}
