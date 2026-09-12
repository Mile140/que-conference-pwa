import { useEffect, useState } from "preact/hooks";
import PageHero from "../components/PageHero";
import { attendee, authSession } from "../lib/auth";
import { isOnline } from "../lib/network";
import { trackEvent } from "../lib/analytics";
import { useQuestions } from "../lib/questions";
import { useSettings } from "../lib/settings";

interface QuestionsProps {
  path?: string;
}

/**
 * Day 2 Q&A Panel Questions and Day 3 Discussion Questions (spec §3.6):
 * public read, public submit (name required if unverified), verified
 * upvote. Submitting doesn't require verification -- someone might be
 * hitting the exact app trouble verification itself would involve -- but
 * since this is a public list, an unverified submitter has to give a name
 * so their question doesn't just show up anonymous next to everyone else's
 * real name; `questions_guest_name_required` enforces that server-side too.
 */
export default function Questions(_props: QuestionsProps) {
  const { questions, voteCounts, myVotes, loading, error: loadError, submit, toggleVote } = useQuestions();
  const { settings } = useSettings();
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const verified = authSession.value && attendee.value;

  useEffect(() => {
    trackEvent("view_questions");
  }, []);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    if (!isOnline.value) {
      setError("You're offline — reconnect to submit a question.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await submit(body, verified ? undefined : guestName);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setBody("");
    setGuestName("");
  }

  return (
    <>
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Day 2 Q&A Panel Questions and Day 3 Discussion Questions"
        subtitle="Submit what you want covered in the group discussion, and upvote what others have asked so the moderator knows what matters most."
      />

      <section class="card">
        {!settings.questions_open && (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Question submission is currently closed.</p>
        )}

        {settings.questions_open && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!verified && (
              <>
                <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.85rem" }}>
                  Not verified, so your name is required here (this list is public, unlike Feedback).{" "}
                  <a href="/verify">Verify your email</a> instead if you also want to upvote.
                </p>
                <input
                  value={guestName}
                  onInput={(e) => setGuestName((e.target as HTMLInputElement).value)}
                  placeholder="Your name (required)"
                  required
                  style={{ padding: 10 }}
                />
              </>
            )}
            <textarea
              value={body}
              onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
              placeholder="What do you want the group to cover?"
              rows={3}
              style={{ padding: 10, resize: "vertical" }}
            />
            {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
            <button
              type="submit"
              class="btn-gold"
              disabled={submitting || !body.trim() || !isOnline.value || (!verified && !guestName.trim())}
              style={{ alignSelf: "flex-start" }}
            >
              {submitting ? "Submitting…" : isOnline.value ? "Submit question" : "Offline"}
            </button>
          </form>
        )}
      </section>

      {loading && <p>Loading questions…</p>}
      {loadError && <p style={{ color: "crimson" }}>Couldn't load questions: {loadError}</p>}
      {!loading && !loadError && questions.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No questions submitted yet.</p>
      )}

      {questions.map((q) => {
        const mine = myVotes.has(q.id);
        return (
          <div class="card" key={q.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0 }}>{q.body}</p>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {q.attendees?.name || q.guest_name || "Attendee"}
                {!q.attendee_id && " (unverified)"}
              </div>
            </div>
            <button
              type="button"
              disabled={!verified || !isOnline.value}
              onClick={() => toggleVote(q.id)}
              title={!verified ? "Verify to upvote" : !isOnline.value ? "You're offline" : mine ? "Remove upvote" : "Upvote"}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "6px 12px",
                background: mine ? "var(--brand-highlight)" : "transparent",
                color: mine ? "var(--navy)" : "var(--text)",
                border: "1px solid var(--brand-highlight)",
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
