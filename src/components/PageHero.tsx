import type { ComponentChildren } from "preact";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: ComponentChildren;
  action?: ComponentChildren;
  children?: ComponentChildren;
}

/**
 * Navy "hero block" that replaces the plain intro `.card` at the top of most
 * pages (visual redesign, 2026-08 -- see README). `subtitle` is for a short
 * description or a verify-prompt link; `action` is for a single small
 * control that belongs in the header itself (e.g. the gold "+" upload button
 * on Photos); `children` is for anything larger that needs the hero's dark
 * background (e.g. Schedule's day-pill row).
 */
export default function PageHero({ eyebrow, title, subtitle, action, children }: PageHeroProps) {
  return (
    <section class="page-hero">
      <div class="page-hero-top">
        <div>
          <div class="hero-eyebrow">{eyebrow}</div>
          <h2 class="hero-title">{title}</h2>
        </div>
        {action}
      </div>
      {subtitle && <div class="hero-sub">{subtitle}</div>}
      {children}
    </section>
  );
}
