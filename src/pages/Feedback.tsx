import { useEffect, useState } from "preact/hooks";
import PageHero from "../components/PageHero";
import { attendee, authSession } from "../lib/auth";
import { isOnline } from "../lib/network";
import { trackEvent } from "../lib/analytics";
import { submitIssueReport } from "../lib/issueReports";

interface FeedbackProps {
  path?: string;
}

/**
 * Private "report an issue" form -- goes straight to the organizers, not
 * shown to other attendees. Open to guests too, not just verified
 * attendees: someone hitting app trouble may not be able to verify in the
 * first place (e.g. if verification is itself what's broken), so gating
 * this behind verification would block exactly the reports that matter
 * most. Unverified senders get optional name/email fields instead, since
 * there's no attendee record to identify them by.
 */
export default function Feedback(_props: FeedbackProps) {
  const verified = authSession.value && attendee.value;
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    trackEvent("view_feedback");
  }, []);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    if (!isOnline.value) {
      setError("You're offline — reconnect to send this.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await submitIssueReport(
      body,
      verified ? undefined : { name: guestName, email: guestEmail }
    );
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setBody("");
    setGuestName("");
    setGuestEmail("");
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
          {!verified && (
            <>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.85rem" }}>
                You're not verified, so this goes in anonymous unless you tell us who you are.{" "}
                <a href="/verify">Verify your email</a> instead if you want a reply.
              </p>
              <input
                value={guestName}
                onInput={(e) => setGuestName((e.target as HTMLInputElement).value)}
                placeholder="Your name (optional)"
                style={{ padding: 10 }}
              />
              <input
                type="email"
                value={guestEmail}
                onInput={(e) => setGuestEmail((e.target as HTMLInputElement).value)}
                placeholder="Your email, if you want a reply (optional)"
                style={{ padding: 10 }}
              />
            </>
          )}
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
