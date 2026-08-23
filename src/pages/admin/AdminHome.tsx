import AdminGuard from "../../components/AdminGuard";
import RouterLink from "../../components/RouterLink";
import PageHero from "../../components/PageHero";
import { signOut } from "../../lib/auth";
import { useSettings } from "../../lib/settings";
import { supabase } from "../../lib/supabase";

interface AdminHomeProps {
  path?: string;
}

export default function AdminHome(_props: AdminHomeProps) {
  return (
    <AdminGuard>
      <AdminHomeContent />
    </AdminGuard>
  );
}

function AdminHomeContent() {
  const { settings, loading } = useSettings();

  async function setSetting(key: "feedback_enabled" | "questions_open", value: boolean) {
    const { error } = await supabase.from("settings").update({ value }).eq("key", key);
    if (error) console.error(`Failed to update ${key}`, error);
    // No local state update needed -- useSettings is realtime-subscribed
    // and will pick up the change itself.
  }

  return (
    <>
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Admin"
        action={
          <button type="button" class="hero-ghost-btn" onClick={signOut}>
            Sign out
          </button>
        }
      />

      <section class="card">
        <h3 style={{ marginTop: 0 }}>Global toggles</h3>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={settings.feedback_enabled}
                onChange={(e) => setSetting("feedback_enabled", (e.target as HTMLInputElement).checked)}
              />
              Session feedback enabled
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={settings.questions_open}
                onChange={(e) => setSetting("questions_open", (e.target as HTMLInputElement).checked)}
              />
              Day-3 question submission open
            </label>
          </div>
        )}
      </section>

      <section class="card">
        <h3 style={{ marginTop: 0 }}>Moderation &amp; engagement</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <RouterLink href="/admin/moderation">Moderate questions</RouterLink>
          <RouterLink href="/admin/photos">Moderate photos</RouterLink>
          <RouterLink href="/admin/feedback">Feedback</RouterLink>
          <RouterLink href="/admin/announcements">Announcements</RouterLink>
        </div>
      </section>

      <section class="card">
        <h3 style={{ marginTop: 0 }}>Content</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <RouterLink href="/admin/sessions">Sessions</RouterLink>
          <RouterLink href="/admin/speakers">Speakers</RouterLink>
          <RouterLink href="/admin/sponsors">Sponsors</RouterLink>
          <RouterLink href="/admin/maps">Venue &amp; Maps</RouterLink>
          <RouterLink href="/admin/info">Info Pages</RouterLink>
        </div>
      </section>

      <section class="card">
        <h3 style={{ marginTop: 0 }}>Insights</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <RouterLink href="/admin/stats">Usage stats</RouterLink>
        </div>
      </section>

      <section class="card">
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Eventbrite import isn't in the admin console yet — run <code>scripts/import_attendees.py</code>{" "}
          for attendee imports, and use the Supabase dashboard directly for anything else not listed above.
        </p>
      </section>
    </>
  );
}
