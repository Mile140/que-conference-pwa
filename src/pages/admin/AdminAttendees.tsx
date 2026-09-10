import { useEffect, useMemo, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import PageHero from "../../components/PageHero";
import { supabase } from "../../lib/supabase";
import { uploadImage } from "../../lib/storageUpload";

interface AdminAttendeesProps {
  path?: string;
}

interface AttendeeRow {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  job_title: string | null;
  job_function: string | null;
  focus_areas: string[];
  photo_url: string | null;
  bio: string | null;
  contact_opt_in: boolean;
  is_speaker: boolean;
  auth_user_id: string | null;
  verified_at: string | null;
  imported_at: string | null;
}

const SELECT_COLS =
  "id, email, name, company, job_title, job_function, focus_areas, photo_url, bio, contact_opt_in, is_speaker, auth_user_id, verified_at, imported_at";

export default function AdminAttendees(_props: AdminAttendeesProps) {
  return (
    <AdminGuard>
      <AdminAttendeesContent />
    </AdminGuard>
  );
}

function AdminAttendeesContent() {
  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [unverifiedOnly, setUnverifiedOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.from("attendees").select(SELECT_COLS).order("name", { ascending: true });
    if (error) console.error("Failed to load attendees", error);
    setRows((data as AttendeeRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (unverifiedOnly) list = list.filter((a) => !a.verified_at);
    if (needle) {
      list = list.filter((a) =>
        [a.name, a.email, a.company].filter(Boolean).some((v) => v!.toLowerCase().includes(needle))
      );
    }
    return list;
  }, [rows, q, unverifiedOnly]);

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Attendees"
        subtitle="Fix up profile info on the fly — typos from the Eventbrite import, late registrations, anything an attendee hasn't filled in themselves yet. Speaker status and session links are still managed on the Speakers page."
      />

      <section class="card">
        <input
          type="search"
          placeholder="Search by name, email, or company…"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={unverifiedOnly}
            onChange={(e) => setUnverifiedOnly((e.target as HTMLInputElement).checked)}
          />
          Not yet verified only
        </label>
      </section>

      {loading && <p>Loading…</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "var(--text-muted)" }}>No attendees match.</p>}

      {filtered.map((a) => (
        <div class="card" key={a.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <strong>{a.name || "(name pending)"}</strong>
              <span style={{ color: "var(--text-muted)" }}> · {a.email}</span>
              {a.company && <span style={{ color: "var(--text-muted)" }}> · {a.company}</span>}
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                {a.verified_at ? "✓ Verified" : "Not yet verified"}
                {a.is_speaker && " · Speaker"}
              </div>
            </div>
            <button type="button" onClick={() => setEditingId(editingId === a.id ? null : a.id)} style={{ padding: "6px 12px", flexShrink: 0 }}>
              {editingId === a.id ? "Close" : "Edit"}
            </button>
          </div>

          {editingId === a.id && (
            <AttendeeEditor
              attendee={a}
              onSaved={async () => {
                setEditingId(null);
                await load();
              }}
            />
          )}
        </div>
      ))}
    </>
  );
}

type AttendeeFormState = {
  email: string;
  name: string;
  company: string;
  job_title: string;
  job_function: string;
  focus_areas: string;
  bio: string;
  photo_url: string;
  contact_opt_in: boolean;
};

function attendeeToForm(a: AttendeeRow): AttendeeFormState {
  return {
    email: a.email,
    name: a.name ?? "",
    company: a.company ?? "",
    job_title: a.job_title ?? "",
    job_function: a.job_function ?? "",
    focus_areas: (a.focus_areas ?? []).join(", "),
    bio: a.bio ?? "",
    photo_url: a.photo_url ?? "",
    contact_opt_in: a.contact_opt_in,
  };
}

function AttendeeEditor({ attendee, onSaved }: { attendee: AttendeeRow; onSaved: () => void }) {
  const [form, setForm] = useState<AttendeeFormState>(attendeeToForm(attendee));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email doubles as the login identity once someone's verified (it's what
  // the OTP goes to, and it's what auth_user_id gets linked against) --
  // editing it here for a verified attendee would silently break their
  // login without also touching Supabase Auth, which this page doesn't do.
  // Safe to fix pre-verification, when it's still just a plain data field.
  const emailEditable = !attendee.auth_user_id;

  function set<K extends keyof AttendeeFormState>(key: K, value: AttendeeFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
    set("photo_url", url ?? "");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim() || null,
      company: form.company.trim() || null,
      job_title: form.job_title.trim() || null,
      job_function: form.job_function.trim() || null,
      focus_areas: form.focus_areas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      bio: form.bio.trim() || null,
      photo_url: form.photo_url || null,
      contact_opt_in: form.contact_opt_in,
    };
    if (emailEditable) {
      const trimmedEmail = form.email.trim().toLowerCase();
      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        setSaving(false);
        setError("Enter a valid email.");
        return;
      }
      payload.email = trimmedEmail;
    }

    const { error: err } = await supabase.from("attendees").update(payload).eq("id", attendee.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid var(--border, #ddd)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Email</label>
      <input
        value={form.email}
        onInput={(e) => set("email", (e.target as HTMLInputElement).value)}
        disabled={!emailEditable}
        style={{ padding: 8 }}
      />
      {!emailEditable && (
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Can't be changed here once someone's verified — it's tied to their login.
        </p>
      )}

      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Name</label>
      <input value={form.name} onInput={(e) => set("name", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />

      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Company / repair station</label>
      <input value={form.company} onInput={(e) => set("company", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />

      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Job title</label>
      <input value={form.job_title} onInput={(e) => set("job_title", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />

      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Job function</label>
      <input
        value={form.job_function}
        onInput={(e) => set("job_function", (e.target as HTMLInputElement).value)}
        placeholder="e.g. Inventory, Finance, Parts Sales"
        style={{ padding: 8 }}
      />

      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Areas of focus (comma-separated)</label>
      <input
        value={form.focus_areas}
        onInput={(e) => set("focus_areas", (e.target as HTMLInputElement).value)}
        placeholder="e.g. MRO, parts sales, inventory"
        style={{ padding: 8 }}
      />

      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Bio</label>
      <textarea
        value={form.bio}
        onInput={(e) => set("bio", (e.target as HTMLTextAreaElement).value)}
        rows={2}
        style={{ padding: 8, resize: "vertical" }}
      />

      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Photo</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {form.photo_url && (
          <img src={form.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
        )}
        <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploading} />
        {uploading && <span style={{ color: "var(--text-muted)" }}>Uploading…</span>}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <input
          type="checkbox"
          checked={form.contact_opt_in}
          onChange={(e) => set("contact_opt_in", (e.target as HTMLInputElement).checked)}
        />
        Let other attendees contact them (shows a "Send email" button on their directory entry)
      </label>

      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
      <button type="button" class="btn-gold" onClick={handleSave} disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
