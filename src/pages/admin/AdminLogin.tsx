import { useState } from "preact/hooks";
import { route } from "preact-router";
import { authSession, isAdmin, signInAdminPassword } from "../../lib/auth";

interface AdminLoginProps {
  path?: string;
}

export default function AdminLogin(_props: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authSession.value && isAdmin.value) {
    route("/admin", true);
    return null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signInAdminPassword(email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    route("/admin", true);
  }

  return (
    <section class="card" style={{ maxWidth: 360, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Admin Sign In</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="email"
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          placeholder="Email"
          autocomplete="username"
          style={{ padding: 10 }}
        />
        <input
          type="password"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          placeholder="Password"
          autocomplete="current-password"
          style={{ padding: 10 }}
        />
        {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={submitting || !email || !password} style={{ padding: "8px 14px" }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
