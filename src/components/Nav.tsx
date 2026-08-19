import type { ComponentChildren, VNode } from "preact";
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

// preact-router/match's LinkProps extends preact's *generic* HTMLAttributes,
// which (unlike React's looser types) doesn't include `href` — that's only
// on preact's more specific AnchorHTMLAttributes. Rather than fight a type
// mismatch in a third-party .d.ts, cast once here so every call site above
// gets normal type-checking on the props that matter (href/activeClassName/children).
const RouterLink = Link as unknown as (props: {
  href: string;
  activeClassName?: string;
  children?: ComponentChildren;
}) => VNode;

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
