import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import { supabase } from "../../lib/supabase";
import { useSponsors } from "../../lib/sponsors";
import {
  TYPE_LABELS,
  formatDay,
  formatTimeRange,
  groupByDay,
  isoToPacificDateTimeLocal,
  pacificWallTimeToISO,
  type Session,
  type SessionType,
} from "../../lib/sessions";

interface AdminSessionsProps {
  path?: string;
}

type SessionFormState = {
  title: string;
  startLocal: string;
  endLocal: string;
  room: string;
  track: string;
  type: SessionType;
  description: string;
  materials_url: string;
  lab_notes: string;
  presenter_text: string;
  sponsor_id: string;
  sort: string;
};

const BLANK_FORM: SessionFormState = {
  title: "",
  startLocal: "",
  endLocal: "",
  room: "",
  track: "",
  type: "general_session",
  description: "",
  materials_url: "",
  lab_notes: "",
  presenter_text: "",
  sponsor_id: "",
  sort: "0",
};

export default function AdminSessions(_props: AdminSessionsProps) {
  return (
    <AdminGuard>
      <AdminSessionsContent />
    </AdminGuard>
  );
}

function AdminSessionsContent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { sponsors } = useSponsors();

  async function load() {
    const { data, error: err } = await supabase.from("sessions").select("*").order("start", { ascending: true });
    if (err) console.error("Failed to load sessions", err);
    setError(err?.message ?? null);
    setSessions((data as Session[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    const { error: err } = await supabase.from("sessions").delete().eq("id", id);
    if (err) {
      console.error("Failed to delete session", err);
      return;
    }
    await load();
  }

  const days = groupByDay(sessions);

  return (
    <>
      <section class="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Sessions</h2>
        <button type="button" onClick={() => setCreating(true)} style={{ padding: "6px 12px" }}>
          + Add session
        </button>
      </section>

      {creating && (
        <SessionForm
          initial={BLANK_FORM}
          sponsors={sponsors}
          onCancel={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Couldn't load sessions: {error}</p>}

      {days.map(({ day, sessions: daySessions }) => (
        <section key={day}>
          <h3>{formatDay(day)}</h3>
          {daySessions.map((s) =>
            editingId === s.id ? (
              <SessionForm
                key={s.id}
                initial={sessionToForm(s)}
                sponsors={sponsors}
                onCancel={() => setEditingId(null)}
                onSaved={async () => {
                  setEditingId(null);
                  await load();
                }}
                sessionId={s.id}
              />
            ) : (
              <div class="card" key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div>
                  <strong>{s.title}</strong>
                  <div style={{ color: "var(--text-muted)" }}>
                    {TYPE_LABELS[s.type]} · {formatTimeRange(s)}
                    {s.room ? ` · ${s.room}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => setEditingId(s.id)} style={{ padding: "6px 12px" }}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(s.id)} style={{ padding: "6px 12px" }}>
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      ))}
    </>
  );
}

function sessionToForm(s: Session): SessionFormState {
  return {
    title: s.title,
    startLocal: isoToPacificDateTimeLocal(s.start),
    endLocal: isoToPacificDateTimeLocal(s.end),
    room: s.room ?? "",
    track: s.track ?? "",
    type: s.type,
    description: s.description ?? "",
    materials_url: s.materials_url ?? "",
    lab_notes: s.lab_notes ?? "",
    presenter_text: s.presenter_text ?? "",
    sponsor_id: s.sponsor_id ?? "",
    sort: String(s.sort ?? 0),
  };
}

function SessionForm({
  initial,
  sponsors,
  onCancel,
  onSaved,
  sessionId,
}: {
  initial: SessionFormState;
  sponsors: { id: string; name: string }[];
  onCancel: () => void;
  onSaved: () => void;
  sessionId?: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof SessionFormState>(key: K, value: SessionFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!form.title.trim() || !form.startLocal || !form.endLocal) {
      setError("Title, start, and end are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const startISO = pacificWallTimeToISO(form.startLocal);
    const payload = {
      title: form.title.trim(),
      day: startISO.slice(0, 10),
      start: startISO,
      end: pacificWallTimeToISO(form.endLocal),
      room: form.room.trim() || null,
      track: form.track.trim() || null,
      type: form.type,
      description: form.description.trim() || null,
      materials_url: form.materials_url.trim() || null,
      lab_notes: form.lab_notes.trim() || null,
      presenter_text: form.presenter_text.trim() || null,
      sponsor_id: form.sponsor_id || null,
      sort: parseInt(form.sort, 10) || 0,
    };

    const { error: err } = sessionId
      ? await supabase.from("sessions").update(payload).eq("id", sessionId)
      : await supabase.from("sessions").insert(payload);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} class="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input placeholder="Title" value={form.title} onInput={(e) => set("title", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", gap: 4 }}>
          Start (Pacific)
          <input
            type="datetime-local"
            value={form.startLocal}
            onInput={(e) => set("startLocal", (e.target as HTMLInputElement).value)}
            style={{ padding: 8 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", gap: 4 }}>
          End (Pacific)
          <input
            type="datetime-local"
            value={form.endLocal}
            onInput={(e) => set("endLocal", (e.target as HTMLInputElement).value)}
            style={{ padding: 8 }}
          />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input placeholder="Room" value={form.room} onInput={(e) => set("room", (e.target as HTMLInputElement).value)} style={{ padding: 8, flex: 1 }} />
        <input placeholder="Track" value={form.track} onInput={(e) => set("track", (e.target as HTMLInputElement).value)} style={{ padding: 8, flex: 1 }} />
        <select value={form.type} onChange={(e) => set("type", (e.target as HTMLSelectElement).value as SessionType)} style={{ padding: 8 }}>
          {(Object.keys(TYPE_LABELS) as SessionType[]).map((t) => (
            <option value={t} key={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        placeholder="Description"
        value={form.description}
        onInput={(e) => set("description", (e.target as HTMLTextAreaElement).value)}
        rows={2}
        style={{ padding: 8, resize: "vertical" }}
      />
      <input
        placeholder="Materials URL"
        value={form.materials_url}
        onInput={(e) => set("materials_url", (e.target as HTMLInputElement).value)}
        style={{ padding: 8 }}
      />
      <textarea
        placeholder="Lab notes (hands-on labs only)"
        value={form.lab_notes}
        onInput={(e) => set("lab_notes", (e.target as HTMLTextAreaElement).value)}
        rows={2}
        style={{ padding: 8, resize: "vertical" }}
      />
      <input
        placeholder="Presenter (free text, e.g. team name)"
        value={form.presenter_text}
        onInput={(e) => set("presenter_text", (e.target as HTMLInputElement).value)}
        style={{ padding: 8 }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={form.sponsor_id} onChange={(e) => set("sponsor_id", (e.target as HTMLSelectElement).value)} style={{ padding: 8, flex: 1 }}>
          <option value="">No presenting sponsor</option>
          {sponsors.map((sp) => (
            <option value={sp.id} key={sp.id}>
              {sp.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Sort"
          value={form.sort}
          onInput={(e) => set("sort", (e.target as HTMLInputElement).value)}
          style={{ padding: 8, width: 80 }}
        />
      </div>
      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={saving} style={{ padding: "8px 14px" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: "8px 14px" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
