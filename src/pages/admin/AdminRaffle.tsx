import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import AdminGuard from "../../components/AdminGuard";
import PageHero from "../../components/PageHero";
import { supabase } from "../../lib/supabase";

interface AdminRaffleProps {
  path?: string;
}

interface RaffleAttendee {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  verified_at: string | null;
}

interface WinnerRow {
  id: string;
  attendee_id: string | null;
  attendee_name: string;
  attendee_company: string | null;
  prize: string | null;
  drawn_at: string;
}

const ITEM_HEIGHT = 96;
const REEL_LENGTH = 26; // filler rows + the winner as the final row
const SPIN_MS = 4200;

export default function AdminRaffle(_props: AdminRaffleProps) {
  return (
    <AdminGuard>
      <AdminRaffleContent />
    </AdminGuard>
  );
}

function displayName(a: { name: string | null; email: string }) {
  return a.name?.trim() || a.email;
}

function AdminRaffleContent() {
  const [attendees, setAttendees] = useState<RaffleAttendee[]>([]);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [excludePastWinners, setExcludePastWinners] = useState(true);
  const [prize, setPrize] = useState("");

  const [reel, setReel] = useState<RaffleAttendee[]>([]);
  const [offset, setOffset] = useState(0);
  const [transitionOn, setTransitionOn] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RaffleAttendee | null>(null);
  const reelRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const [{ data: attendeeData, error: aErr }, { data: winnerData, error: wErr }] = await Promise.all([
      supabase.from("attendees").select("id, name, email, company, verified_at").order("name", { ascending: true }),
      supabase.from("raffle_winners").select("*").order("drawn_at", { ascending: false }),
    ]);
    if (aErr) console.error("Failed to load attendees", aErr);
    if (wErr) console.error("Failed to load raffle winners", wErr);
    setAttendees((attendeeData as RaffleAttendee[]) ?? []);
    setWinners((winnerData as WinnerRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const pastWinnerIds = useMemo(() => new Set(winners.map((w) => w.attendee_id).filter(Boolean)), [winners]);

  const eligible = useMemo(() => {
    return attendees.filter((a) => {
      if (verifiedOnly && !a.verified_at) return false;
      if (excludePastWinners && pastWinnerIds.has(a.id)) return false;
      return true;
    });
  }, [attendees, verifiedOnly, excludePastWinners, pastWinnerIds]);

  function handleSpin() {
    if (eligible.length === 0 || spinning) return;
    setError(null);
    setWinner(null);

    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    const filler: RaffleAttendee[] = [];
    for (let i = 0; i < REEL_LENGTH - 1; i++) {
      filler.push(eligible[Math.floor(Math.random() * eligible.length)]);
    }
    const nextReel = [...filler, picked];

    // Two-phase reset: snap the reel back to the top with transitions off,
    // let the browser paint that (two nested rAFs), then turn transitions
    // back on and set the target offset -- otherwise the browser coalesces
    // the reset + the animated move into a single no-op frame and nothing
    // visibly spins on repeat clicks.
    setTransitionOn(false);
    setReel(nextReel);
    setOffset(0);
    setSpinning(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionOn(true);
        setOffset(-(nextReel.length - 1) * ITEM_HEIGHT);
      });
    });

    window.setTimeout(async () => {
      setSpinning(false);
      setWinner(picked);
      const { error: err } = await supabase.from("raffle_winners").insert({
        attendee_id: picked.id,
        attendee_name: displayName(picked),
        attendee_company: picked.company,
        prize: prize.trim() || null,
      });
      if (err) {
        console.error("Failed to log raffle winner", err);
        setError("Winner picked, but couldn't save it to the winners log: " + err.message);
      }
      await load();
    }, SPIN_MS);
  }

  async function handleRemoveWinner(id: string) {
    const { error: err } = await supabase.from("raffle_winners").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Raffle picker"
        subtitle="Spin to pick a random attendee for a prize drawing. Winners are logged below so the same person doesn't get pulled twice."
      />

      <section class="card">
        <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Prize (optional)</label>
        <input
          value={prize}
          onInput={(e) => setPrize((e.target as HTMLInputElement).value)}
          placeholder="e.g. $50 gift card"
          style={{ width: "100%", padding: 10, marginTop: 4, marginBottom: 12 }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly((e.target as HTMLInputElement).checked)}
            />
            Only include verified attendees
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={excludePastWinners}
              onChange={(e) => setExcludePastWinners((e.target as HTMLInputElement).checked)}
            />
            Exclude previous winners
          </label>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "10px 0 0" }}>
          {loading ? "Loading attendees…" : `${eligible.length} eligible attendee${eligible.length === 1 ? "" : "s"}`}
        </p>
      </section>

      <section class="card" style={{ textAlign: "center" }}>
        <div class="raffle-reel-window">
          <div
            ref={reelRef}
            style={{
              transform: `translateY(${offset}px)`,
              transition: transitionOn ? `transform ${SPIN_MS}ms cubic-bezier(0.1, 0.8, 0.25, 1)` : "none",
            }}
          >
            {reel.length === 0 ? (
              <div class="raffle-reel-item">
                <strong style={{ color: "var(--text-muted)" }}>Ready when you are</strong>
              </div>
            ) : (
              reel.map((a, i) => (
                <div class="raffle-reel-item" key={`${a.id}-${i}`}>
                  <strong>{displayName(a)}</strong>
                  {a.company && <span>{a.company}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          class="btn-gold"
          onClick={handleSpin}
          disabled={spinning || eligible.length === 0 || loading}
          style={{ marginTop: 16, padding: "12px 28px", fontSize: "1rem" }}
        >
          {spinning ? "Spinning…" : "🎰 Spin"}
        </button>

        {error && <p style={{ color: "crimson", marginTop: 10 }}>{error}</p>}

        {winner && !spinning && (
          <div class="raffle-winner-card" style={{ marginTop: 20 }}>
            <div style={{ color: "var(--brand-highlight)", fontWeight: 700, letterSpacing: "0.04em", fontSize: "0.8rem" }}>
              🎉 WINNER 🎉
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: 6 }}>{displayName(winner)}</div>
            {winner.company && <div style={{ color: "var(--text-muted)" }}>{winner.company}</div>}
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>{winner.email}</div>
            {prize.trim() && (
              <div style={{ marginTop: 8 }}>
                <span class="badge-gold">{prize.trim()}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {winners.length > 0 && (
        <section class="card">
          <h3 style={{ marginTop: 0 }}>Winners log</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {winners.map((w) => (
              <div
                key={w.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
              >
                <div>
                  <strong>{w.attendee_name}</strong>
                  {w.attendee_company && <span style={{ color: "var(--text-muted)" }}> · {w.attendee_company}</span>}
                  {w.prize && <span style={{ color: "var(--text-muted)" }}> · {w.prize}</span>}
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {new Date(w.drawn_at).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveWinner(w.id)}
                  title="Remove from log (e.g. if this was a misfire)"
                  style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", flexShrink: 0 }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
