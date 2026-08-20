import { theme, toggleTheme } from "../lib/theme";
import { attendee, authSession } from "../lib/auth";
import RouterLink from "./RouterLink";

export default function Header() {
  const verified = authSession.value && attendee.value;

  return (
    <header class="app-header">
      <span class="brand">QUE Group Conference</span>
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
