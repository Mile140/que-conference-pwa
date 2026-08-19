// Data-layer offline cache for read content (schedule, speakers, sponsors,
// maps, info — spec §7). The service worker (vite-plugin-pwa/Workbox, see
// vite.config.ts) already caches the Supabase REST responses via
// NetworkFirst, which covers "reload while offline". This module is the
// place Phase 2 will add an IndexedDB-backed store so the app can read
// structured data (not just raw HTTP responses) when there's no network at
// all on cold start — e.g. keyed getters like getSessions()/getSpeakers()
// that fall back to IndexedDB when the Supabase fetch rejects.
//
// Intentionally a stub in Phase 1: there's no real content yet to cache.
export {};
