import { useState } from "preact/hooks";
import { route } from "preact-router";
import { attendee, authSession, sendLoginCode, verifyLoginCode } from "../lib/auth";

interface VerifyProps {
  path?: string;
}

type Step = "email" | "code";

/**
 * Passwordless verification (spec §2.2/D24): email -> 6-digit code -> done.
 * No password, ever. Unlocks personal agenda, directory presence, contact,
 * Day-3 questions, feedback, photo wall, and the private learning list.
 */
export default function Verify(_props: VerifyProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (authSession.value && attendee.value) {
    route("/profile");
    return null;
  }

  async function handleSendCode(e: Event) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await sendLoginCode(email);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setStep("code");
  }

  async function handleVerify(e: Event) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await verifyLoginCode(email, code);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    route("/profile");
  }

  return (
    <section class="card">
      <h2 style={{ marginTop: 0 }}>Verify your email</h2>
      <p style={{ color: "var(--text-muted)" }}>
        No password -- just a 6-digit code, once. Unlocks your personal agenda, the
        attendee directory, Day-3 questions, session feedback, the photo wall, and your
        private learning list.
      </p>

      {step === "email" && (
        <form onSubmit={handleSendCode}>
          <input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />
          <button type="submit" disabled={busy} style={{ padding: "10px 16px" }}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerify}>
          <p>
            Sent a 6-digit code to <strong>{email}</strong>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            placeholder="123456"
            value={code}
            onInput={(e) => setCode((e.target as HTMLInputElement).value)}
            style={{ width: "100%", padding: 10, marginBottom: 8, letterSpacing: 4 }}
          />
          <button type="submit" disabled={busy} style={{ padding: "10px 16px" }}>
            {busy ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            style={{ padding: "10px 16px", marginLeft: 8, background: "transparent", border: "1px solid var(--border)" }}
          >
            Use a different email
          </button>
        </form>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </section>
  );
}
