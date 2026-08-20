import { theme, toggleTheme } from "../lib/theme";
import { attendee, authSession } from "../lib/auth";
import RouterLink from "./RouterLink";

export default function Header() {
  const verified = authSession.value && attendee.value;

  return (
    <header class="app-header">
      <span class="brand" style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span>2026 QUE Group Conference</span>
        <span style={{ fontSize: "0.7rem", fontWeight: 400, opacity: 0.85 }}>
          San Diego, CA · Sep 16–18, 2026
        </span>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <RouterLink
          href={verified ? "/profile" : "/verify"}
          style={{ color: "var(--white)", fontSize: "0.85rem", textDecoration: "underline" }}
        >
          {verified ? attendee.value!.name || "My profile" : "Verify email"}
        </RouterLink>
        <button class="theme-toggle" onClick={toggleTheme}>
          {theme.value === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </header>
  );
}
