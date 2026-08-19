import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      // TODO(Phase 1 follow-up): swap the placeholder favicon.svg for the real
      // MikeCarey.Tech-branded logo (spec §4.1) and add proper 192/512 PNG
      // icons (needed for Android/desktop install prompts + iOS apple-touch-icon,
      // which requires PNG — SVG isn't honored there). Placeholder SVG icon
      // used here so the manifest is valid and install works in the meantime;
      // no code-execution sandbox was available this session to rasterize PNGs.
      manifest: {
        name: "QUE Group Conference",
        short_name: "QUE Conference",
        description: "QUE Group Conference companion app — schedule, directory, and live updates.",
        theme_color: "#15294D",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
      },
      workbox: {
        // App shell + static assets: cache-first via Workbox precache (default).
        // Read content from Supabase (schedule, speakers, sponsors, maps, info)
        // is cached at the data layer (see src/lib/offlineCache.ts), not here —
        // that data changes at runtime and needs app-controlled invalidation.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            // Supabase REST reads: network-first so live data wins when online,
            // falling back to the last-known response when offline.
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest-cache",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          },
          {
            // Supabase Storage (photos, logos, maps): cache-first, they're immutable by URL.
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/"),
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173
  }
});
