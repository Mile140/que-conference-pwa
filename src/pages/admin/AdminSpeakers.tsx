import { useEffect, useMemo, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import { supabase } from "../../lib/supabase";
import { uploadImage } from "../../lib/storageUpload";
import { useSponsors } from "../../lib/sponsors";
import { formatDay, formatTimeRange, groupByDay, type Session } from "../../lib/sessions";

interface AdminSpeakersProps {
  path?: string;
}

interface SpeakerAttendee {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  is_speaker: boolean;
  bio: string | null;
  photo_url: string | null;
  sponsor_id: string | null;
}

export default function AdminSpeakers(_props: AdminSpeakersProps) {
  return (
    <AdminGuard>
      <AdminSpeakersContent />
    </AdminGuard>
  );
}

function AdminSpeakersContent() {
  const [attendees, setAttendees] = useState<SpeakerAttendee[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sponsors } = useSponsors();

  async function load() {
    const [attendeesRes, sessionsRes] = await Promise.all([
      supabase
        .from("attendees")
        .select("id, name, email, company, is_speaker, bio, photo_url, sponsor_id")
        .order("name", { ascending: true }),
      supabase.from("sessions").select("*").order("start", { ascending: true }),
    ]);
    if (attendeesRes.error) console.error("Failed to load attendees", attendeesRes.error);
    if (sessionsRes.error) console.error("Failed to load sessions", sessionsRes.error);
    setAttendees((attendeesRes.data as SpeakerAttendee[]) ?? []);
    setSessions((sessionsRes.data as Session[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleSpeaker(a: SpeakerAttendee) {
    const { error } = await supabase.from("attendees").update({ is_speaker: !a.is_speaker }).eq("id", a.id);
    if (error) {
      console.error("Failed to toggle speaker flag", error);
      return;
    }
    if (!a.is_speaker) setExpandedId(a.id); // just flagged as speaker -- open the detail editor
    await load();
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return attendees;
    return attendees.filter((a) =>
      [a.name, a.email, a.company].filter(Boolean).some((v) => v!.toLowerCase().includes(needle))
    );
  }, [attendees, q]);

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0 }}>Speakers</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          Flag attendees as speakers, then edit their bio/photo, sponsor link, and which sessions
          they're presenting.
        </p>
        <input
          type="search"
          placeholder="Search attendees by name, email, or company…"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          style={{ width: "100%", padding: 10 }}
        />
      </section>

      {loading && <p>Loading…</p>}

      {filtered.map((a) => (
        <div class="card" key={a.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={a.is_speaker} onChange={() => toggleSpeaker(a)} />
              <span>
                <strong>{a.name || "(name pending)"}</strong>
                {a.company && <span style={{ color: "var(--text-muted)" }}> · {a.company}</span>}
              </span>
            </label>
            {a.is_speaker && (
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                style={{ padding: "6px 12px" }}
              >
                {expandedId === a.id ? "Close" : "Edit"}
              </button>
            )}
          </div>

          {a.is_speaker && expandedId === a.id && (
            <SpeakerEditor
              attendee={a}
              sessions={sessions}
              sponsors={sponsors}
              onSaved={async () => {
                await load();
              }}
            />
          )}
        </div>
      ))}
    </>
  );
}

function SpeakerEditor({
  attendee,
  sessions,
  sponsors,
  onSaved,
}: {
  attendee: SpeakerAttendee;
  sessions: Session[];
  sponsors: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [bio, setBio] = useState(attendee.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(attendee.photo_url ?? "");
  const [sponsorId, setSponsorId] = useState(attendee.sponsor_id ?? "");
  const [linkedSessionIds, setLinkedSessionIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("session_speakers")
      .select("session_id")
      .eq("attendee_id", attendee.id)
      .then(({ data, error: err }) => {
        if (err) console.error("Failed to load speaker's sessions", err);
        setLinkedSessionIds(new Set((data ?? []).map((r) => r.session_id as string)));
      });
  }, [attendee.id]);

  async function handlePhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error: err } = await uploadImage("avatars", file);
    setUploading(false);
    if (err) {
      setError(err);
      return;
    }
    setPhotoUrl(url ?? "");
  }

  async function toggleSession(sessionId: string) {
    const has = linkedSessionIds.has(sessionId);
    const { error: err } = has
      ? await supabase.from("session_speakers").delete().eq("session_id", sessionId).eq("attendee_id", attendee.id)
      : await supabase.from("session_speakers").insert({ session_id: sessionId, attendee_id: attendee.id });
    if (err) {
      console.error("Failed to update session link", err);
      return;
    }
    setLinkedSessionIds((prev) => {
      const next = new Set(prev);
      if (has) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("attendees")
      .update({ bio: bio.trim() || null, photo_url: photoUrl || null, sponsor_id: sponsorId || null })
      .eq("id", attendee.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  const days = groupByDay(sessions);

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border, #ddd)", display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        placeholder="Bio"
        value={bio}
        onInput={(e) => setBio((e.target as HTMLTextAreaElement).value)}
        rows={3}
        style={{ padding: 8, resize: "vertical" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {photoUrl && <img src={photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />}
        <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploading} />
        {uploading && <span style={{ color: "var(--text-muted)" }}>Uploading…</span>}
      </div>

      <select value={sponsorId} onChange={(e) => setSponsorId((e.target as HTMLSelectElement).value)} style={{ padding: 8 }}>
        <option value="">Not a sponsor contact</option>
        {sponsors.map((sp) => (
          <option value={sp.id} key={sp.id}>
            Represents {sp.name}
          </option>
        ))}
      </select>

      <div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 4 }}>Speaking at:</div>
        {days.map(({ day, sessions: daySessions }) => (
          <div key={day} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{formatDay(day)}</div>
            {daySessions.map((s) => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                <input type="checkbox" checked={linkedSessionIds.has(s.id)} onChange={() => toggleSession(s.id)} />
                {s.title} <span style={{ color: "var(--text-muted)" }}>({formatTimeRange(s)})</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
      <button type="button" onClick={handleSave} disabled={saving} style={{ padding: "8px 14px", alignSelf: "flex-start" }}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
