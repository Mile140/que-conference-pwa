import { useState } from "preact/hooks";
import PageHero from "../components/PageHero";
import { attendee, authSession } from "../lib/auth";
import { isOnline } from "../lib/network";
import { submitIssueReport } from "../lib/issueReports";

interface FeedbackProps {
  path?: string;
}

/** Private "report an issue" form -- goes straight to the organizers, not shown to other attendees. */
export default function Feedback(_props: FeedbackProps) {
  const verified = authSession.value && attendee.value;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!verified) {
    return (
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Report an issue"
        subtitle={
          <>
            <a href="/verify">Verify your email</a> to send feedback or report a problem to the
            organizers.
          </>
        }
      />
    );
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    if (!isOnline.value) {
      setError("You're offline — reconnect to send this.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await submitIssueReport(body);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setBody("");
    setSent(true);
  }

  return (
    <>
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Report an issue"
        subtitle="App acting up? Room mix-up? Something else you want the organizers to know about? This goes straight to us — not posted anywhere public."
      />

      <section class="card">
        {sent && (
          <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
            Thanks — we got it and will follow up if needed.
          </p>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={body}
            onInput={(e) => {
              setSent(false);
              setBody((e.target as HTMLTextAreaElement).value);
            }}
            placeholder="What's going on?"
            rows={4}
            style={{ padding: 10, resize: "vertical" }}
          />
          {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
          <button type="submit" class="btn-gold" disabled={submitting || !body.trim() || !isOnline.value} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Sending…" : isOnline.value ? "Send" : "Offline"}
          </button>
        </form>
      </section>
    </>
  );
}
