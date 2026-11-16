import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { bootCss, bootHtml } from './src/boot-view';

export default defineConfig({
  // GitHub Pages serves from /<repo>/; set by the deploy workflow.
  base: process.env.BASE_PATH ?? '/',
  // Packed seafloor grids, so tests can import them (`?inline`) to check physics on real depths.
  assetsInclude: ['**/*.i16', '**/*.u8', '**/*.rle16'],
  plugins: [
    // The launch screen (PLAN 7.160) goes straight into index.html, so it shows before any script or style loads.
    { name: 'surcast-boot', transformIndexHtml: (html: string) => html.replace('<!--sc-boot-->', `<style>${bootCss()}</style>${bootHtml()}`) },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SurCast',
        short_name: 'SurCast',
        description: 'Ocean forecasts for fishing, diving, surf and more on Costa Rica\'s southern Caribbean coast, Gandoca to Limón',
        theme_color: '#070C14',
        background_color: '#000000',
        display: 'standalone',
        // SurCast icons (src/brand.ts, written by scripts/brand-icons.ts). Maskable has its own art so the mark stays in the safe circle.
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Seafloor grids and reef/seamark GeoJSON (public/data/seafloor) are precached so depth works offline.
        globPatterns: ['**/*.{js,mjs,css,html,svg,woff,woff2,json,geojson,i16,u8,rle16,gz}'],
        // Forecast grids change every few hours; src/adapters/cache.ts keeps their offline copy (docs/DATA.md).
        // The species guide (PLAN 7.91) precaches only its index; each species file, thumbnail and photo is kept
        // once opened (the routes below), so a reader's guide works offline for what they have looked at.
        globIgnores: ['**/data/forecast/**', '**/data/guide/sp/**', '**/data/guide/img/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Map style, fonts and tiles cached as you browse (capped, oldest evicted). "Sync for trip" (PLAN 5.1,
        // src/offline/sync.ts) stores the whole region in `trip-v1`, which this route falls back to on a miss; its own
        // downloads carry `ftsync=1` and skip the route. The plugins run inside the service worker, so they are
        // self-contained (workbox-build copies their source).
        runtimeCaching: [
          {
            urlPattern: /\/data\/guide\/(sp|img)\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'guide-v1', expiration: { maxEntries: 4000 } },
          },
          {
            // Species photos are linked from iNaturalist and Wikimedia Commons with their credits (docs/GUIDE.md).
            urlPattern: /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org|(upload|thumb)\.wikimedia\.org)\//,
            handler: 'CacheFirst',
            // v2 and 200 only (2026-11-16): v1 kept opaque responses, so one failed load left a photo broken for 90 days.
            options: { cacheName: 'guide-photos-v2', expiration: { maxEntries: 600, maxAgeSeconds: 90 * 24 * 3600 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/(?!.*[?&]ftsync=1)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 3000 },
              plugins: [
                {
                  // OpenFreeMap moves to a new planet folder weekly: key tiles without it (same as tileKey in src/offline/tiles.ts).
                  cacheKeyWillBeUsed: async ({ request }) => request.url.replace(/\/planet\/[^/]+\/(\d+\/\d+\/\d+\.pbf)/, '/planet/v/$1'),
                  cachedResponseWillBeUsed: async ({ request, cachedResponse }) =>
                    cachedResponse ?? (await (await caches.open('trip-v1')).match(request.url.replace(/\/planet\/[^/]+\/(\d+\/\d+\/\d+\.pbf)/, '/planet/v/$1'))),
                },
              ],
            },
          },
        ],
      },
    }),
  ],
});
