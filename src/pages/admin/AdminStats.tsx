import AdminGuard from "../../components/AdminGuard";
import PageHero from "../../components/PageHero";
import { pageViewLabel, useUsageStats } from "../../lib/analytics";

interface AdminStatsProps {
  path?: string;
}

export default function AdminStats(_props: AdminStatsProps) {
  return (
    <AdminGuard>
      <AdminStatsContent />
    </AdminGuard>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div class="card" style={{ margin: 0, padding: "14px 16px" }}>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 600, color: "var(--brand-primary)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function AdminStatsContent() {
  const { stats, loading, error } = useUsageStats();

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Usage stats"
        subtitle="Attendee activity and page views. Page-view counts reflect the most recent 5,000 recorded events."
      />

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Couldn't load usage stats: {error}</p>}

      {stats && (
        <>
          <h3 style={{ marginBottom: 10 }}>Attendees</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            <StatCard label="Total imported" value={stats.attendeesTotal} />
            <StatCard label="Verified" value={stats.attendeesVerified} />
          </div>

          <h3 style={{ marginBottom: 10 }}>Engagement</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            <StatCard label="Questions" value={stats.questions} />
            <StatCard label="Question upvotes" value={stats.questionVotes} />
            <StatCard label="Photos posted" value={stats.photos} />
            <StatCard label="Photo comments" value={stats.photoComments} />
            <StatCard label="Learning list items" value={stats.learningItems} />
            <StatCard label="Session ratings" value={stats.sessionRatings} />
            <StatCard label="Announcements" value={stats.announcements} />
            <StatCard label="Feedback reports" value={`${stats.issueReportsTotal} (${stats.issueReportsOpen} open)`} />
          </div>

          <h3 style={{ marginBottom: 10 }}>Page views</h3>
          {stats.pageViews.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No page views recorded yet.</p>
          ) : (
            <div class="card">
              {stats.pageViews.map((pv) => (
                <div key={pv.eventType} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>{pageViewLabel(pv.eventType)}</span>
                  <strong>{pv.count}</strong>
                </div>
              ))}
            </div>
          )}

          {stats.topSessions.length > 0 && (
            <>
              <h3 style={{ marginTop: 20, marginBottom: 10 }}>Most-viewed sessions</h3>
              <div class="card">
                {stats.topSessions.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>{s.title}</span>
                    <strong>{s.views}</strong>
                  </div>
                ))}
              </div>
            </>
          )}

          {stats.topSponsors.length > 0 && (
            <>
              <h3 style={{ marginTop: 20, marginBottom: 10 }}>Most-viewed sponsors</h3>
              <div class="card">
                {stats.topSponsors.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>{s.name}</span>
                    <strong>{s.views}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
