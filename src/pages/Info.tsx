import { useEffect } from "preact/hooks";
import CachedBanner from "../components/CachedBanner";
import PageHero from "../components/PageHero";
import { trackEvent } from "../lib/analytics";
import { useInfoPages } from "../lib/infoPages";

interface InfoProps {
  path?: string;
}

export default function Info(_props: InfoProps) {
  const { pages, loading, stale } = useInfoPages();

  useEffect(() => {
    trackEvent("view_info");
  }, []);

  return (
    <>
      <PageHero eyebrow="2026 QUE Group Conference" title="Info" />

      {loading && <p>Loading…</p>}
      {stale && <CachedBanner />}
      {!loading && pages.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Wifi, parking, and local info will be posted here.</p>
      )}

      {pages.map((p) => (
        <div class="card" key={p.id}>
          <strong>{p.title}</strong>
          {p.body && <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{p.body}</p>}
        </div>
      ))}
    </>
  );
}
