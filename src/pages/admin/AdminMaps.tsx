import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import PageHero from "../../components/PageHero";
import { supabase } from "../../lib/supabase";
import { uploadImage } from "../../lib/storageUpload";
import type { VenueMap } from "../../lib/venueMaps";

interface AdminMapsProps {
  path?: string;
}

type MapFormState = {
  title: string;
  type: string;
  description: string;
  image_url: string;
  sort: string;
};

const BLANK_FORM: MapFormState = { title: "", type: "venue", description: "", image_url: "", sort: "0" };

export default function AdminMaps(_props: AdminMapsProps) {
  return (
    <AdminGuard>
      <AdminMapsContent />
    </AdminGuard>
  );
}

function AdminMapsContent() {
  const [rows, setRows] = useState<VenueMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.from("venue_maps").select("*").order("sort", { ascending: true });
    if (error) console.error("Failed to load maps", error);
    setRows((data as VenueMap[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("venue_maps").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete map", error);
      return;
    }
    await load();
  }

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Venue & maps"
        action={
          <button type="button" class="btn-gold" onClick={() => setCreating(true)} style={{ padding: "6px 14px" }}>
            + Add map
          </button>
        }
      />

      {creating && (
        <MapForm
          initial={BLANK_FORM}
          onCancel={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}

      {loading && <p>Loading…</p>}

      {rows.map((m) =>
        editingId === m.id ? (
          <MapForm
            key={m.id}
            initial={{
              title: m.title,
              type: m.type ?? "",
              description: m.description ?? "",
              image_url: m.image_url ?? "",
              sort: String(m.sort ?? 0),
            }}
            mapId={m.id}
            onCancel={() => setEditingId(null)}
            onSaved={async () => {
              setEditingId(null);
              await load();
            }}
          />
        ) : (
          <div class="card" key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <strong>{m.title}</strong>
              {m.type && <span style={{ color: "var(--text-muted)" }}> · {m.type}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => setEditingId(m.id)} style={{ padding: "6px 12px" }}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(m.id)} style={{ padding: "6px 12px" }}>
                Delete
              </button>
            </div>
          </div>
        )
      )}
    </>
  );
}

function MapForm({
  initial,
  mapId,
  onCancel,
  onSaved,
}: {
  initial: MapFormState;
  mapId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof MapFormState>(key: K, value: MapFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error: err } = await uploadImage("maps", file);
    setUploading(false);
    if (err) {
      setError(err);
      return;
    }
    set("image_url", url ?? "");
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      type: form.type.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      sort: parseInt(form.sort, 10) || 0,
    };

    const { error: err } = mapId
      ? await supabase.from("venue_maps").update(payload).eq("id", mapId)
      : await supabase.from("venue_maps").insert(payload);

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
      <input
        placeholder="Type (e.g. venue, hotel, offsite)"
        value={form.type}
        onInput={(e) => set("type", (e.target as HTMLInputElement).value)}
        style={{ padding: 8 }}
      />
      <textarea
        placeholder="Description"
        value={form.description}
        onInput={(e) => set("description", (e.target as HTMLTextAreaElement).value)}
        rows={2}
        style={{ padding: 8, resize: "vertical" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {form.image_url && <img src={form.image_url} alt="" style={{ maxHeight: 60 }} />}
        <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} />
        {uploading && <span style={{ color: "var(--text-muted)" }}>Uploading…</span>}
      </div>
      <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", gap: 4, width: 120 }}>
        Sort
        <input type="number" value={form.sort} onInput={(e) => set("sort", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />
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
