import RouterLink from "./RouterLink";

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
        <RouterLink href={link.href} activeClassName="active" key={link.href}>
          {link.label}
        </RouterLink>
      ))}
    </nav>
  );
}
