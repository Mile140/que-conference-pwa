import { Link } from "preact-router/match";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Now & Next" },
  { href: "/schedule", label: "Schedule" },
  { href: "/directory", label: "Directory" },
  { href: "/speakers", label: "Speakers" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/maps", label: "Maps" },
  { href: "/info", label: "Info" }
];

export default function Nav() {
  return (
    <nav class="app-nav">
      {LINKS.map((link) => (
        <Link href={link.href} activeClassName="active" key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
