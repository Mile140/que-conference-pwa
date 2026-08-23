import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import PageHero from "../../components/PageHero";
import { supabase } from "../../lib/supabase";
import { uploadImage } from "../../lib/storageUpload";
import { type Sponsor } from "../../lib/sponsors";

interface AdminSponsorsProps {
  path?: string;
}

type SponsorFormState = {
  name: string;
  logo_url: string;
  description: string;
  website: string;
  contact: string;
  sponsoring_text: string;
  display_order: string;
};

const BLANK_FORM: SponsorFormState = {
  name: "",
  logo_url: "",
  description: "",
  website: "",
  contact: "",
  sponsoring_text: "",
  display_order: "0",
};

export default function AdminSponsors(_props: AdminSponsorsProps) {
  return (
    <AdminGuard>
      <AdminSponsorsContent />
    </AdminGuard>
  );
}

function AdminSponsorsContent() {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState<Sponsor[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase.from("sponsors").select("*").order("display_order", { ascending: true });
    if (error) console.error("Failed to load sponsors", error);
    setRows((data as Sponsor[]) ?? []);
    setRowsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete sponsor", error);
      return;
    }
    await load();
  }

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Sponsors"
        action={
          <button type="button" class="btn-gold" onClick={() => setCreating(true)} style={{ padding: "6px 14px" }}>
            + Add sponsor
          </button>
        }
      />

      {creating && (
        <SponsorForm
          initial={BLANK_FORM}
          onCancel={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}

      {rowsLoading && <p>Loading…</p>}

      {rows.map((s) =>
        editingId === s.id ? (
          <SponsorForm
            key={s.id}
            initial={sponsorToForm(s)}
            sponsorId={s.id}
            onCancel={() => setEditingId(null)}
            onSaved={async () => {
              setEditingId(null);
              await load();
            }}
          />
        ) : (
          <div class="card" key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {s.logo_url && <img src={s.logo_url} alt={s.name} style={{ maxHeight: 32 }} />}
              <div>
                <strong>{s.name}</strong>
                {s.sponsoring_text && <div style={{ color: "var(--text-muted)" }}>{s.sponsoring_text}</div>}
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
    </>
  );
}

function sponsorToForm(s: Sponsor): SponsorFormState {
  return {
    name: s.name,
    logo_url: s.logo_url ?? "",
    description: s.description ?? "",
    website: s.website ?? "",
    contact: s.contact ?? "",
    sponsoring_text: s.sponsoring_text ?? "",
    display_order: String(s.display_order ?? 0),
  };
}

function SponsorForm({
  initial,
  sponsorId,
  onCancel,
  onSaved,
}: {
  initial: SponsorFormState;
  sponsorId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof SponsorFormState>(key: K, value: SponsorFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleLogoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error: err } = await uploadImage("sponsor-logos", file);
    setUploading(false);
    if (err) {
      setError(err);
      return;
    }
    set("logo_url", url ?? "");
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      logo_url: form.logo_url || null,
      description: form.description.trim() || null,
      website: form.website.trim() || null,
      contact: form.contact.trim() || null,
      sponsoring_text: form.sponsoring_text.trim() || null,
      display_order: parseInt(form.display_order, 10) || 0,
    };

    const { error: err } = sponsorId
      ? await supabase.from("sponsors").update(payload).eq("id", sponsorId)
      : await supabase.from("sponsors").insert(payload);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} class="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input placeholder="Name" value={form.name} onInput={(e) => set("name", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {form.logo_url && <img src={form.logo_url} alt="" style={{ maxHeight: 32 }} />}
        <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} />
        {uploading && <span style={{ color: "var(--text-muted)" }}>Uploading…</span>}
      </div>

      <textarea
        placeholder="Description"
        value={form.description}
        onInput={(e) => set("description", (e.target as HTMLTextAreaElement).value)}
        rows={2}
        style={{ padding: 8, resize: "vertical" }}
      />
      <input placeholder="Website" value={form.website} onInput={(e) => set("website", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />
      <input placeholder="Contact" value={form.contact} onInput={(e) => set("contact", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />
      <input
        placeholder="What they're sponsoring (e.g. Wednesday-night drinks)"
        value={form.sponsoring_text}
        onInput={(e) => set("sponsoring_text", (e.target as HTMLInputElement).value)}
        style={{ padding: 8 }}
      />
      <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", gap: 4, width: 120 }}>
        Display order
        <input
          type="number"
          value={form.display_order}
          onInput={(e) => set("display_order", (e.target as HTMLInputElement).value)}
          style={{ padding: 8 }}
        />
      </label>

      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" class="btn-gold" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: "8px 14px" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
