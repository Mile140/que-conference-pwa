# QUE Group Conference PWA

Installable, offline-capable companion app for the QUE Group Conference 2026 (San Diego, Sept 16–18). Built & provided by [MikeCarey.Tech](https://mikecarey.tech).

See `QUE-Conference-PWA-Spec-v1.1.docx` in this folder for the full spec — treat it as the source of truth.

## Stack

- **Frontend:** Vite + Preact + TypeScript, `vite-plugin-pwa` (Workbox) for the service worker/manifest, `@preact/signals` for state, `preact-router` for routing.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime), project `que-conference-pwa`, US West (Oregon).
- **Hosting:** Cloudflare Pages at `quegroup.mikecarey.tech`.

## Local development

```bash
npm install
npm run dev
```

`.env` is already populated with the Supabase project URL and anon (publishable) key for local dev — it's gitignored, so it won't be committed. `.env.example` shows the shape for a fresh checkout.

## Build

```bash
npm run build
```

Output goes to `dist/`. `public/_redirects` makes Cloudflare Pages serve `index.html` for all routes (client-side routing via `preact-router`).

## Deploying

Cloudflare Pages project, connected to this repo's git remote:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`)
- Custom domain: `quegroup.mikecarey.tech`

## Project status — Phase 1: Foundation

Done:

- Supabase schema (all tables from spec §6, plus `push_subscriptions` and `photos.thumbnail_url` — see note below), RLS policies (guest read / verified-attendee write / admin all), storage buckets (`photos`, `avatars`, `sponsor-logos`, `maps`), realtime enabled on `announcements`, `sessions`, `questions`, `question_votes`, `photos`, `photo_comments`.
- PWA shell: manifest, service worker (offline app-shell caching + runtime caching for Supabase REST/Storage), install support, iOS home-screen meta tags.
- Palette theming (`src/theme.css`) with light/dark toggle, matched to spec §5.1.
- Landing scaffold: nav shell to all top-level sections, announcements feed wired live to Supabase (with Realtime subscription), rotating sponsor footer, "Now & Next" placeholder for Phase 2.

Schema additions beyond spec §6 (flagged to Mike before building, not a silent change):

- `push_subscriptions` table — needed for web push (D16/D27) but wasn't listed in §6.
- `photos.thumbnail_url` column — spec requires thumbnails served in the feed (§3.9) but the indicative schema only had `image_url`.

Not yet built (later phases per spec §12): session data/Now & Next logic (Phase 2), Eventbrite import + passwordless auth + directory (Phase 3), Day-3 questions/learning list/feedback/push (Phase 4), speakers/sponsors/branding pages (Phase 5), venue/info content (Phase 6), admin console (Phase 7), photo wall + launch polish (Phase 8).

Admin auth mechanism (email/password vs. something else) is still an open decision — flag for Phase 3.
