import { useEffect, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import { supabase } from "../../lib/supabase";
import type { InfoPage } from "../../lib/infoPages";

interface AdminInfoPagesProps {
  path?: string;
}

type InfoFormState = {
  title: string;
  body: string;
  published: boolean;
  sort: string;
};

const BLANK_FORM: InfoFormState = { title: "", body: "", published: true, sort: "0" };

export default function AdminInfoPages(_props: AdminInfoPagesProps) {
  return (
    <AdminGuard>
      <AdminInfoPagesContent />
    </AdminGuard>
  );
}

function AdminInfoPagesContent() {
  const [rows, setRows] = useState<InfoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    // Admins see unpublished drafts too (RLS: published = true OR is_admin()).
    const { data, error } = await supabase.from("info_pages").select("*").order("sort", { ascending: true });
    if (error) console.error("Failed to load info pages", error);
    setRows((data as InfoPage[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("info_pages").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete info page", error);
      return;
    }
    await load();
  }

  return (
    <>
      <section class="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Info Pages</h2>
        <button type="button" onClick={() => setCreating(true)} style={{ padding: "6px 12px" }}>
          + Add page
        </button>
      </section>

      {creating && (
        <InfoForm
          initial={BLANK_FORM}
          onCancel={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}

      {loading && <p>Loading…</p>}

      {rows.map((p) =>
        editingId === p.id ? (
          <InfoForm
            key={p.id}
            initial={{ title: p.title, body: p.body ?? "", published: p.published, sort: String(p.sort ?? 0) }}
            pageId={p.id}
            onCancel={() => setEditingId(null)}
            onSaved={async () => {
              setEditingId(null);
              await load();
            }}
          />
        ) : (
          <div class="card" key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, opacity: p.published ? 1 : 0.6 }}>
            <div>
              <strong>{p.title}</strong>
              <span style={{ color: "var(--text-muted)" }}> · {p.published ? "Published" : "Draft"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => setEditingId(p.id)} style={{ padding: "6px 12px" }}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(p.id)} style={{ padding: "6px 12px" }}>
                Delete
              </button>
            </div>
          </div>
        )
      )}
    </>
  );
}

function InfoForm({
  initial,
  pageId,
  onCancel,
  onSaved,
}: {
  initial: InfoFormState;
  pageId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof InfoFormState>(key: K, value: InfoFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
      body: form.body.trim() || null,
      published: form.published,
      sort: parseInt(form.sort, 10) || 0,
    };

    const { error: err } = pageId
      ? await supabase.from("info_pages").update(payload).eq("id", pageId)
      : await supabase.from("info_pages").insert(payload);

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
      <textarea
        placeholder="Body text"
        value={form.body}
        onInput={(e) => set("body", (e.target as HTMLTextAreaElement).value)}
        rows={4}
        style={{ padding: 8, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", (e.target as HTMLInputElement).checked)} />
          Published
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", gap: 4, width: 100 }}>
          Sort
          <input type="number" value={form.sort} onInput={(e) => set("sort", (e.target as HTMLInputElement).value)} style={{ padding: 8 }} />
        </label>
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
