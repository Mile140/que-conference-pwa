import { theme, toggleTheme } from "../lib/theme";

export default function Header() {
  return (
    <header class="app-header">
      <span class="brand">QUE Group Conference</span>
      <button class="theme-toggle" onClick={toggleTheme}>
        {theme.value === "dark" ? "Light mode" : "Dark mode"}
      </button>
    </header>
  );
}
