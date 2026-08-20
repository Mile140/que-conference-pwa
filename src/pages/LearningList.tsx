import { useState } from "preact/hooks";
import { attendee, authSession } from "../lib/auth";
import { useLearningList, type LearningItem } from "../lib/learningList";

interface LearningListProps {
  path?: string;
}

/** Private per-attendee learning list (spec §3.7) -- never shown to others. */
export default function LearningList(_props: LearningListProps) {
  const { items, loading, addItem, updateItem, removeItem } = useLearningList();
  const [title, setTitle] = useState("");

  if (!authSession.value || !attendee.value) {
    return (
      <section class="card">
        <h2 style={{ marginTop: 0 }}>My Learning List</h2>
        <p>
          <a href="/verify">Verify your email</a> to keep a private list of things you want to
          learn at the conference.
        </p>
      </section>
    );
  }

  async function handleAdd(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    await addItem(title);
    setTitle("");
  }

  return (
    <>
      <section class="card">
        <h2 style={{ marginTop: 0 }}>My Learning List</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          Private to you -- questions to ask, topics to figure out. Jot notes as you learn things
          from sessions or hallway chats.
        </p>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="e.g. How do other sites handle X?"
            style={{ flex: 1, padding: 10 }}
          />
          <button type="submit" disabled={!title.trim()} style={{ padding: "8px 14px" }}>
            Add
          </button>
        </form>
      </section>

      {loading && <p>Loading…</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Nothing on your list yet.</p>
      )}

      {items.map((item) => (
        <LearningListItem key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} />
      ))}
    </>
  );
}

function LearningListItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: LearningItem;
  onUpdate: (id: string, patch: Partial<Pick<LearningItem, "title" | "notes" | "done">>) => void;
  onRemove: (id: string) => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? "");

  return (
    <div class="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) => onUpdate(item.id, { done: (e.target as HTMLInputElement).checked })}
            style={{ marginTop: 4 }}
          />
          <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "var(--text-muted)" : "inherit" }}>
            {item.title}
          </span>
        </label>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          title="Remove"
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>
      <textarea
        value={notes}
        onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
        onBlur={() => {
          if (notes !== (item.notes ?? "")) onUpdate(item.id, { notes });
        }}
        placeholder="Notes on what you learned…"
        rows={2}
        style={{ width: "100%", marginTop: 8, padding: 8, resize: "vertical" }}
      />
    </div>
  );
}
