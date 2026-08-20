import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  sponsoring_text: string | null;
}

/**
 * Rotating sponsor footer (spec §3.4) — shows one sponsor at random on load,
 * reshuffling each mount, linking to that sponsor's detail page. Real
 * sponsor detail pages/routing land in Phase 5; this renders the footer
 * shell against whatever is already in the `sponsors` table.
 */
export default function SponsorFooter() {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("sponsors")
      .select("id, name, logo_url, sponsoring_text")
      .then(({ data, error }) => {
        if (cancelled || error || !data || data.length === 0) return;
        const pick = data[Math.floor(Math.random() * data.length)];
        setSponsor(pick as Sponsor);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer class="app-footer">
      {sponsor && (
        <div class="card" style={{ textAlign: "left" }}>
          {sponsor.logo_url && (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              style={{ maxHeight: 32, marginBottom: 8 }}
            />
          )}
          <div>
            <strong>{sponsor.name}</strong>
            {sponsor.sponsoring_text ? ` — ${sponsor.sponsoring_text}` : ""}
          </div>
        </div>
      )}
      <div class="credit">
        Built &amp; provided by MikeCarey.Tech
        <span style={{ opacity: 0.6 }}> · v{__APP_VERSION__}</span>
      </div>
    </footer>
  );
}
