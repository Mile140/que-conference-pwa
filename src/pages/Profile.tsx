import { useEffect, useState } from "preact/hooks";
import { route } from "preact-router";
import { attendee, authLoading, authSession, refreshAttendee, signOut } from "../lib/auth";
import { supabase } from "../lib/supabase";

interface ProfileProps {
  path?: string;
}

/**
 * Editable profile (spec §3.5): the fields Eventbrite never collects.
 * Contact opt-in defaults on and is clearly explained here (D18).
 */
export default function Profile(_props: ProfileProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobFunction, setJobFunction] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [contactOptIn, setContactOptIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const a = attendee.value;
    if (a) {
      setName(a.name ?? "");
      setCompany(a.company ?? "");
      setJobTitle(a.job_title ?? "");
      setJobFunction(a.job_function ?? "");
      setFocusAreas((a.focus_areas ?? []).join(", "));
      setContactOptIn(a.contact_opt_in);
    }
  }, [attendee.value?.id]);

  if (authLoading.value) return <p>Loading…</p>;
  if (!authSession.value || !attendee.value) {
    route("/verify");
    return null;
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("attendees")
      .update({
        name: name.trim() || null,
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
        job_function: jobFunction.trim() || null,
        focus_areas: focusAreas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        contact_opt_in: contactOptIn,
      })
      .eq("id", attendee.value!.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save profile", error);
      return;
    }
    await refreshAttendee();
    setSaved(true);
  }

  return (
    <section class="card">
      <h2 style={{ marginTop: 0 }}>Your profile</h2>
      <p style={{ color: "var(--text-muted)" }}>{attendee.value.email}</p>

      <form onSubmit={handleSave}>
        <label>Name</label>
        <input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} style={fieldStyle} />

        <label>Company / repair station</label>
        <input value={company} onInput={(e) => setCompany((e.target as HTMLInputElement).value)} style={fieldStyle} />

        <label>Job title</label>
        <input value={jobTitle} onInput={(e) => setJobTitle((e.target as HTMLInputElement).value)} style={fieldStyle} />

        <label>Job function</label>
        <input
          value={jobFunction}
          onInput={(e) => setJobFunction((e.target as HTMLInputElement).value)}
          placeholder="e.g. Inventory, Finance, Parts Sales"
          style={fieldStyle}
        />

        <label>Areas of focus (comma-separated)</label>
        <input
          value={focusAreas}
          onInput={(e) => setFocusAreas((e.target as HTMLInputElement).value)}
          placeholder="e.g. MRO, parts sales, inventory"
          style={fieldStyle}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
          <input
            type="checkbox"
            checked={contactOptIn}
            onChange={(e) => setContactOptIn((e.target as HTMLInputElement).checked)}
          />
          Let other attendees contact me (shows a "Send email" button on my directory entry)
        </label>

        <button type="submit" disabled={saving} style={{ padding: "10px 16px" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span style={{ marginLeft: 12, color: "var(--brand-accent)" }}>Saved.</span>}
      </form>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--border)" }} />
      <button
        type="button"
        onClick={() => signOut()}
        style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--border)" }}
      >
        Sign out
      </button>
    </section>
  );
}

const fieldStyle = { width: "100%", padding: 10, marginBottom: 12, display: "block" };
