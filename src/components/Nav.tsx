import RouterLink from "./RouterLink";
import { isAdmin } from "../lib/auth";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Now & Next" },
  { href: "/schedule", label: "Schedule" },
  { href: "/directory", label: "Directory" },
  { href: "/questions", label: "Questions" },
  { href: "/learning", label: "My List" },
  { href: "/speakers", label: "Speakers" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/photos", label: "Photos" },
  { href: "/maps", label: "Maps" },
  { href: "/info", label: "Info" },
  { href: "/feedback", label: "Feedback" }
];

export default function Nav() {
  return (
    <nav class="app-nav">
      {LINKS.map((link) => (
        <RouterLink href={link.href} activeClassName="active" key={link.href}>
          {link.label}
        </RouterLink>
      ))}
      {isAdmin.value && (
        <RouterLink href="/admin" activeClassName="active">
          Admin
        </RouterLink>
      )}
    </nav>
  );
}
