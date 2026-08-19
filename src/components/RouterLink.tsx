import type { ComponentChildren, JSX, VNode } from "preact";
import { Link } from "preact-router/match";

// preact-router/match's LinkProps extends preact's *generic* HTMLAttributes,
// which (unlike React's looser types) doesn't include `href` -- that's only
// on preact's more specific AnchorHTMLAttributes. Rather than fight a type
// mismatch in a third-party .d.ts in every call site, cast once here.
const RouterLink = Link as unknown as (props: {
  href: string;
  activeClassName?: string;
  children?: ComponentChildren;
  style?: JSX.CSSProperties;
  class?: string;
}) => VNode;

export default RouterLink;
