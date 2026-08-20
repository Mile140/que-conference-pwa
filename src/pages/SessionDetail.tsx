import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";
import { attendee, authSession } from "../lib/auth";
import { useAgenda } from "../lib/agenda";
import { formatDay, formatTimeRange, TYPE_LABELS, type Session } from "../lib/sessions";

interface SessionDetailProps {
  path?: string;
  id?: string; // populated by preact-router from the :id route param
}

export default function SessionDetail({ id }: SessionDetailProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { sessionIds, toggle } = useAgenda();
  const verified = authSession.value && attendee.value;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load session", error);
        if (!data) setNotFound(true);
        setSession((data as Session) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (notFound) return <p>Session not found.</p>;
  if (!session) return null;

  const inAgenda = sessionIds.has(session.id);

  return (
    <article class="card">
      <span class="badge-gold">{TYPE_LABELS[session.type]}</span>
      <h2 style={{ marginTop: 8, marginBottom: 4 }}>{session.title}</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        {formatDay(session.day)} · {formatTimeRange(session)}
        {session.room ? ` · ${session.room}` : ""}
      </p>

      {verified ? (
        <button
          type="button"
          onClick={() => toggle(session.id)}
          style={{
            padding: "8px 14px",
            marginBottom: 12,
            background: inAgenda ? "var(--brand-accent)" : "transparent",
            color: inAgenda ? "var(--white)" : "var(--text)",
            border: "1px solid var(--brand-accent)",
            borderRadius: 6,
          }}
        >
          {inAgenda ? "✓ On my agenda" : "+ Add to my schedule"}
        </button>
      ) : (
        <p style={{ color: "var(--text-muted)" }}>
          <a href="/verify">Verify your email</a> to add this to your personal agenda.
        </p>
      )}

      {session.presenter_text && (
        <p>
          <strong>Presented by:</strong> {session.presenter_text}
        </p>
      )}

      {session.description && <p>{session.description}</p>}

      {session.type === "hands_on_lab" && session.lab_notes && (
        <p>
          <strong>Good to know:</strong> {session.lab_notes}
        </p>
      )}

      {session.materials_url && (
        <p>
          <a href={session.materials_url} target="_blank" rel="noopener noreferrer">
            View materials
          </a>
        </p>
      )}
    </article>
  );
}
