import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";
import { formatDay, formatTimeRange, TYPE_LABELS, type Session } from "../lib/sessions";

interface SessionDetailProps {
  path?: string;
  id?: string; // populated by preact-router from the :id route param
}

export default function SessionDetail({ id }: SessionDetailProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  return (
    <article class="card">
      <span class="badge-gold">{TYPE_LABELS[session.type]}</span>
      <h2 style={{ marginTop: 8, marginBottom: 4 }}>{session.title}</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        {formatDay(session.day)} · {formatTimeRange(session)}
        {session.room ? ` · ${session.room}` : ""}
      </p>

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
