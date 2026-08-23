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

Output goes to `dist/`. SPA fallback (serving `index.html` for all client-side routes) is handled by `not_found_handling: "single-page-application"` in `wrangler.jsonc` — no `_redirects` file needed (that was a Pages-era mechanism; combining it with the Workers static-assets fallback causes a redirect-loop error on deploy).

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

## Project status — Phase 2: Schedule & Sessions

Done:

- Real agenda data loaded into `sessions` (23 rows, from the board's working-draft workbook) — schema additions: `presenter_text` (free-text presenter/team name; proper speaker linking comes in Phase 5) and `source_row_key` (stable key for idempotent re-import).
- `scripts/import_sessions.py` — reusable/re-runnable importer. Re-run it whenever the board updates the workbook; it upserts by `source_row_key` and deliberately leaves `room`/`lab_notes` alone on updates so hand-edits made in Supabase survive a re-import. See the script's docstring for setup (needs the Supabase **service role** key, kept in a local `scripts/.env`, never committed, never exposed to the frontend).
- Schedule page: sessions grouped by day, filterable by type/room/track.
- Session detail page (`/schedule/:id`): title, time, room, type, presenter, description, lab notes, materials link.
- Real "Now & Next" on the landing page, computed from live Supabase data, always displayed in venue-local (Pacific) time regardless of the viewer's device timezone.

Known data gaps carried over from the source workbook (fix directly in Supabase, or update the workbook and re-run the import script):

- No `room` assigned for most sessions (only the two "Round Tables 2" rows have rooms, per your instruction).
- No `track` data at all yet.
- Presenters are mostly team/company names ("CC", "Board") rather than individuals — stored as plain text (`presenter_text`), not yet linked to real speaker profiles.
- `materials_url` is empty for every session (spec allows this — external links only, may be few or none).

Not yet built: personal agenda / add-to-schedule (Phase 3, needs verified-attendee auth), session feedback control (Phase 4), speaker photo/bio linking (Phase 5).

## Project status — Phase 3: Identity & Directory

Done:

- `scripts/import_attendees.py` — reusable Eventbrite export importer (.xlsx or .csv). Handles duplicate ticket-line rows, Eventbrite's "Info Requested" placeholder rows, and trailing "TOTALS" rows. Upserts by email; never touches fields the attendee/admin sets after import (job_title, focus_areas, contact_opt_in, etc.).
- 39 attendees loaded from **last year's (2025)** Eventbrite export as placeholder data — replace by re-running the script against the real 2026 export once registrations open.
- Passwordless email OTP (`/verify`): 6-digit code, no password, via Supabase Auth. First verification either claims a pre-imported attendee row (matched by email) or creates a fresh one (walk-ins not in the Eventbrite export).
- Profile setup (`/profile`): name, company, job title/function, focus areas, contact opt-in (default on, per D18).
- Searchable directory (`/directory`): name/company/role/focus-area search, `mailto:` "Send email" for opted-in attendees. Only visible to verified attendees (guests see a verify prompt), per spec's access tiers.
- Personal agenda: add/remove on the session detail page and a star indicator + "My agenda only" filter on the Schedule page. No reminders yet — that's push infrastructure, Phase 4.
- RLS fix: the original `attendees` UPDATE policy couldn't actually let anyone claim their pre-imported row (chicken-and-egg on `auth_user_id`) — patched so a verified attendee can claim an unclaimed row matching their verified email, and tightened INSERT so a self-created row must use the attendee's own verified email.

Resend SMTP is live (domain verified, custom SMTP configured in Supabase) — real OTP emails are delivering. Note the default "Confirm signup" / "Magic Link" templates only include a clickable link out of the box; they were edited to include `{{ .Token }}` so attendees actually get a 6-digit code to type into `/verify`.

Outstanding:

- **Admin account** — still needs to be created in the Supabase dashboard (Authentication → Users → Add User) and linked into the `admins` table; see chat for exact steps.

## Project status — Phase 4: Engagement

Done:

- Day-3 discussion questions (`/questions`): verified attendees submit and upvote, public read (guests see question text but not the asker's name — attendee names are RLS-gated to verified users, an accepted tradeoff). Gated by `settings.questions_open`. Realtime-backed, sorted by upvotes then submission order.
- Personal learning list (`/learning`): fully private per-attendee CRUD (title + notes + done), never shown to anyone else.
- Session feedback: 1–5 rating on the session detail page, one per attendee per session (upsert), gated by `settings.feedback_enabled`.
- `settings` table added to the Realtime publication so admin toggles (`feedback_enabled`, `questions_open`) take effect live for anyone with the app open, without a refresh — flipping them today still requires a direct SQL update until the Phase 7 admin console exists.

Deliberately deferred (by your choice, to de-risk this phase): **push notifications**. The `push_subscriptions` table and `agenda_items.remind` column exist from Phase 1, but there's no opt-in UI, VAPID keypair, edge function, or reminder cron yet — announcements and any future reminders are in-app/Realtime only for now. This is real new infrastructure (service worker push handling, a Supabase Edge Function to send pushes, a cron job for pre-session reminders) and is scoped as its own follow-up rather than bundled here.

Not yet built: photo wall (Phase 8), push notification delivery (follow-up to Phase 4).

## Project status — Phase 5: Sponsors, Speakers & Branding

Done:

- Speakers page (`/speakers`): lists attendees flagged `is_speaker`, each with photo/bio/company, their linked sessions (via a new `session_speakers` join table — this table, its RLS, and `attendees.sponsor_id` already existed unused in the schema since Phase 1), and a link to their sponsor's page if they're also a sponsor contact.
- Sponsors page (`/sponsors`) and sponsor detail pages (`/sponsors/:id`): logo, description, website, contact, "what they're sponsoring," and any sessions they're presenting (new `sessions.sponsor_id` column).
- Rotating footer now links to the sponsor's detail page instead of just displaying inert text.
- MikeCarey.Tech is seeded as a real sponsor row (not placeholder — its description is fixed spec content) so the "built & provided by" credit has somewhere real to link to.

**Content still needed from you** — the code is ready but the data isn't:

- No attendees are flagged `is_speaker` yet, so `/speakers` is currently empty. Flag them in Supabase (`attendees.is_speaker = true`) as speakers are confirmed.
- No real event sponsors loaded yet (only the seeded MikeCarey.Tech row exists) — add rows to `sponsors` (name, logo_url, description, website, contact, sponsoring_text, display_order) as you get them.
- Neither `session_speakers` nor `sessions.sponsor_id` / `attendees.sponsor_id` are populated — once speakers/sponsors are flagged, link them to their actual sessions the same way (direct SQL or the Supabase table editor, until the Phase 7 admin console exists).

## Project status — Phase 6: Venue & Info

Done:

- Maps page (`/maps`): lists `venue_maps` rows (title, image, description, type badge) — venue/room layout, hotel map, and the off-site event map all use the same table, distinguished by a free-text `type` field.
- Info page (`/info`): lists published `info_pages` rows (title + body text) — wifi, hotel parking, local attractions, and anything else you add. Unpublished drafts stay hidden (RLS already filtered on `published = true` for non-admins from Phase 1).
- Both tables and their RLS already existed unused in the schema since Phase 1 — no migration needed this phase, just the UI.

**Content still needed from you** — both tables are currently empty:

- `venue_maps`: add rows with `title`, `type` (e.g. "venue" / "hotel" / "offsite"), `description`, and optionally `image_url` (upload the image to the existing `maps` Storage bucket first, then paste its public URL here).
- `info_pages`: add rows with `title`, `body`, and `published = true` for anything you want visible (wifi password, parking, local attractions, etc.). `sort` controls display order on both tables.

## Project status — Phase 7 (in progress): Admin & Analytics

You asked for the full Phase 7 scope (admin core, announcements, content CRUD, Eventbrite import + usage-stats). Given the size, this is landing in ordered chunks rather than one drop — this update covers the first two.

Done:

- **Admin login** (`/admin/login`): email + password via Supabase Auth (separate from attendee OTP, per the Phase 3 decision). Admin status is checked via the `is_admin()` RPC, not a direct `select from admins` — that table has no SELECT policy at all (intentional default-deny from Phase 1), so even an admin can't read it directly; `is_admin()` is the sanctioned way in, and it's already exposed for exactly this reason.
- **Admin home** (`/admin`): global toggle switches for `feedback_enabled` and `questions_open`, replacing the direct-SQL updates from earlier phases. Realtime-backed like everywhere else these settings are read.
- **Question moderation** (`/admin/moderation`): lists every question including hidden ones (RLS already let admins see those), hide/unhide toggle.
- **Announcements** (`/admin/announcements`): compose and post new announcements in-app, list existing ones, delete. Push delivery still isn't wired up (Phase 4 follow-up), so this posts to the in-app feed only, same as before.
- The "Admin" nav link only appears once you're signed in as admin — there's no public link to `/admin/login`, you'll need to navigate there directly the first time (bookmark it).

Also fixed two bugs found by real testing: (1) `questions(name)` / `attendees(name)` embeds were returning HTTP 300 "ambiguous relationship" — `question_votes` has FKs to both `questions` and `attendees`, creating an implicit many-to-many bridge on top of the direct FK, so PostgREST couldn't tell which relationship you meant. Fixed by hinting the exact FK (`attendees!questions_attendee_id_fkey(name)`) everywhere that embed is used, and added visible error messages instead of silently showing an empty list. (2) The public Questions page was showing hidden questions to admin viewers (correct per RLS, but confusing to test) — it now always filters out hidden questions client-side regardless of who's signed in, so it reliably shows what a real attendee sees.

**Content CRUD** — in-app editing for everything content management needs:

- Sessions (`/admin/sessions`): create/edit/delete, including a presenting-sponsor link. Start/end times are entered as Pacific wall-clock time and converted with the correct UTC offset automatically (handles the PDT/PST boundary correctly — verified both a September and a January date).
- Speakers (`/admin/speakers`): search attendees, flag/unflag `is_speaker`, edit bio + photo (real upload to Storage, not paste-a-URL), sponsor-contact link, and check off which sessions they're presenting.
- Sponsors (`/admin/sponsors`): full CRUD including logo upload.
- Venue & Maps (`/admin/maps`) and Info Pages (`/admin/info`): full CRUD, maps support image upload direct to the `maps` Storage bucket.
- All three image uploads (speaker photos → `avatars`, sponsor logos → `sponsor-logos`, map images → `maps`) go straight from the browser to Supabase Storage via the existing admin-all storage policy — no more manual dashboard upload + paste-URL step.

Not yet built: Eventbrite import in-app (still run `scripts/import_attendees.py` yourself), and the usage-stats dashboard (needs event-tracking instrumentation added throughout the app first — nothing currently writes to the `analytics_events` table).

## Project status — Phase 8 (in progress): Photo Wall

Done:

- Photo wall (`/photos`): verified attendees upload event photos with an optional caption. Images are compressed client-side (Canvas API, no library) before upload — a full-size version (max 1600px, target 500KB) and a thumbnail (max 480px, target 150KB), both re-encoded as JPEG (quality 0.82, retried at 0.6 if still over target). The grid shows thumbnails; guests can browse but need to verify to upload.
- Photo detail (`/photos/:id`): full image, caption, and a comment thread. Verified attendees can comment; guests see a "verify to comment" prompt.
- Photo moderation (`/admin/photos`): lists every photo including hidden ones, hide/unhide per photo, and an expandable comment list per photo with its own independent hide/unhide.
- `photos`, `photo_comments`, their RLS, and the `photos`/`avatars` Storage policies all already existed unused in the schema since Phase 1 — no migration needed this phase, just the UI and upload logic.
- Both bug patterns found earlier in Phase 7 testing (ambiguous PostgREST embeds; admins seeing hidden content on public-facing pages) were avoided proactively here: `photos`/`photo_comments` embeds use explicit FK hints (`attendees!photos_attendee_id_fkey(name)`, `attendees!photo_comments_attendee_id_fkey(name)`), and the public hooks (`usePhotos`, `usePhotoDetail`) filter out hidden rows client-side regardless of viewer role.
- Verified clean: `tsc --noEmit` and `npm run build` both pass, and a post-phase Supabase security advisory check turned up nothing new (only the same pre-existing accepted items: `admins` has no SELECT policy by design, `is_admin()`/`current_attendee_id()` are intentionally callable by anon/authenticated, and leaked-password-protection is still off).

Offline hardening (also Phase 8):

- Real IndexedDB data cache (`src/lib/offlineCache.ts`, previously a Phase 1 stub): the read hooks for schedule, speakers, sponsors, maps, and info now write their data here on every successful load, and fall back to it if the Supabase fetch fails — so those pages show real content on a cold start with zero connection, not just whatever the service worker's HTTP cache happened to keep from the last visit.
- Each of those pages shows a small "showing saved data from earlier" note when it's running on the cached fallback rather than a live fetch.
- App-wide offline bar (`src/components/OfflineIndicator.tsx`) appears whenever the device has no network, so it's clear the app knows it's disconnected instead of just looking broken.
- Actions that need a live connection — submitting or upvoting a question, uploading a photo, posting a photo comment, rating a session — are disabled with a clear "you're offline" message while offline, instead of failing silently or hanging.

Not yet built (remainder of Phase 8 per spec): final content load once real 2026 data is in, QR code + attendee communications, go-live checklist/prep.

## Visual redesign (2026-08)

A styling pass ("bold color blocks" direction, chosen from a few mockup options) to move away from the plain card-only look. No schema, data, or logic changes — pure CSS/markup.

- `src/theme.css`: new shared classes — `.page-hero` (navy block used at the top of most pages), `.hero-eyebrow` / `.hero-title` / `.hero-sub`, `.pill` / `.pill.active` (defined for future use, not wired up yet — see below), `.btn-gold` (the one gold-filled primary-action button style), `.session-row` / `.session-bar-{type}` (a left color bar per session type instead of a text badge, for faster scanning in long lists), `.avatar-ring` (gold ring on speaker photos/initials).
- `src/components/PageHero.tsx`: shared component (eyebrow/title/subtitle/action/children slots) so every page's intro is consistent instead of hand-rolled per page.
- Applied to: Now & Next, Schedule, Directory, Day-3 Questions, Learning List, Speakers, Sponsors, Maps, Info, Photo Wall. Session detail and sponsor detail pages got lighter-touch updates (gold accent on buttons/badges) rather than a full hero, since they already have a natural title via the session/sponsor name.
- Gold is now the one consistent "this is selected / interactive" color app-wide: nav active tab, question upvotes, agenda toggle, session ratings, and all primary form buttons.
- Speakers without a photo now show initials in a gold-ringed circle instead of nothing.
- Photos you posted yourself get a thin gold border in the photo wall grid.
- One simplification from the mockups: the navy hero and the white content below it are two separate rounded blocks stacked with a gap, not one fused shape with the hero's bottom corners flowing directly into the panel. Visually very close, but much less markup to maintain across ten different pages with very different content shapes.
- Verified clean: `tsc --noEmit` and `npm run build` both pass. No schema touched, so no advisory check needed.

Follow-up pass: the admin console (`/admin/*`) got the same `PageHero` treatment on every page, plus gold primary buttons on the main action in each (sign in, add session/sponsor/map/info page, save profile, post announcement). Secondary actions (edit, delete, hide/unhide, cancel) were deliberately left as plain default buttons so the one gold action per screen stays the obvious "main" thing to click, rather than a wall of gold buttons.

## Project status — Feedback + attendee comms

Done:

- **In-app feedback** (`/feedback`, verified attendees only): a private "report an issue" form that goes straight to the organizers — not shown to anyone else, not a public thread like Questions. New `issue_reports` table: attendees can insert their own reports; only admins can read or resolve them (`/admin/feedback`), which lists reports newest-first with a resolved/unresolved toggle and a "show resolved" filter.
- Added to the main nav (`Feedback`) and the admin home page's moderation section.
- Verified clean: `tsc --noEmit`, `npm run build`, and a post-migration security advisory check (nothing new — same pre-existing accepted items as always).

Attendee communications (for go-live, delivered as files, not built into the app):

- `QUE-2026-App-QR.png` — QR code encoding `https://quegroup.mikecarey.tech`, navy-on-white to match the brand palette, high error-correction so it still scans if a logo overlaps it later.
- `QUE-2026-Attendee-Setup-Email.docx` — draft pre-conference email: what the app is, step-by-step setup (open the link, add to home screen on iPhone/Android, verify by email/OTP), and why verifying is worth it. Yours to send from your own email — nothing here sends on your behalf.
- `QUE-2026-Signage.docx` — two-page print-ready flyer: a full page for the registration table (QR + setup steps + benefits), and a second page with four smaller QR signs (cut-apart, dashed guides) sized for conference room doors.

## Project status — Usage stats dashboard

Done:

- `src/lib/analytics.ts`: `trackEvent(eventType, targetId?)` fires a lightweight, fire-and-forget insert into `analytics_events` (unused since Phase 1 — RLS was already set up right: anyone can insert, only admins can read). Every attendee-facing page calls it on mount (`view_home`, `view_schedule`, `view_directory`, etc.); session, sponsor, and photo detail pages also pass the row's id so views can be attributed to a specific session/sponsor/photo.
- `/admin/stats`: attendee counts (imported vs. verified), engagement counts pulled directly from their source tables (questions, upvotes, photos, photo comments, learning-list items, session ratings, announcements, feedback reports), a page-view breakdown by page, and top-5 most-viewed sessions and sponsors.
- Page-view aggregation happens client-side over the most recent 5,000 events rather than a server-side `GROUP BY` — plenty for this event's scale (dozens of attendees), and avoids adding a database view/function for it. Worth revisiting if this gets reused for a much larger event.
- Verified clean: `tsc --noEmit` and `npm run build` both pass. No schema change this pass (the table and its RLS already existed correctly), so no advisory check needed.

Not yet built: any historical/trend view (this is current totals only, not a day-over-day chart) — flag if you want that for a future event.

## Project status — Email my learning list

Done (closes the backlog item from 2026-08-20):

- New Edge Function `supabase/functions/send-learning-list-email`: emails a verified attendee their own learning list (each item's title/question and notes/answer, plus done status) via the Resend API. It derives the attendee strictly from the caller's own JWT — never from anything the client sends — so there's no way to trigger this for anyone but yourself.
- "Email me this list" button on `/learning` (only shown once you have at least one item), with offline guard and a clear success/error message.
- **Setup required before this actually sends anything** — two Edge Function secrets, set directly in the Supabase dashboard (Project Settings → Edge Functions → `send-learning-list-email` → Secrets) or via `supabase secrets set` in your own terminal, never pasted into chat:
  - `RESEND_API_KEY` — the same Resend account already sending OTP emails. If you don't have the raw key handy, Resend's dashboard (API Keys page) can issue a new one.
  - `LEARNING_LIST_FROM_EMAIL` — optional; defaults to `QUE Group Conference <noreply@quegroup.mikecarey.tech>` if unset (matches the domain actually verified in Resend — an earlier default of `noreply@mikecarey.tech` caused a 403 "Domain not verified" on first test and was corrected). Set this only if you want a different verified sender address.
- Verified clean: `tsc --noEmit` and `npm run build` both pass (the function lives outside `src/`, so it's not part of the frontend type-check — Deno's own runtime types apply there instead). Function deployed and active on the project.

## App shell updates (post-Phase 4)

- **Title & header:** browser tab title and the header brand block now read "2026 QUE Group Conference — San Diego, CA · Sep 16–18, 2026".
- **Build version:** the footer shows `v<build-date>-<git-short-hash>` (e.g. `v2026-08-20-03c9bb9`), computed at build time in `vite.config.ts` via `git rev-parse --short HEAD`. Useful for confirming which deploy you're actually looking at.
- **Update-available banner:** the PWA's `registerType` changed from `autoUpdate` to `prompt` — a new service worker now installs in the background and waits, rather than silently taking over. When one's ready, a banner appears at the top of the app ("A new version of the app is available" + Refresh button); clicking it activates the new version and reloads. See `src/lib/updateSW.ts` / `src/components/UpdateBanner.tsx`.

## Backlog (not scheduled to a phase yet)

_(empty for now)_
