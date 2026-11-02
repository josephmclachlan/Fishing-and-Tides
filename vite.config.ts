import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages serves from /<repo>/; set by the deploy workflow.
  base: process.env.BASE_PATH ?? '/',
  // Packed seafloor grids, so tests can import them (`?inline`) to check physics on real depths.
  assetsInclude: ['**/*.i16', '**/*.u8', '**/*.rle16'],
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Fishing and Tides',
        short_name: 'Tides',
        description: 'Ocean conditions and fishing HUD, Gandoca to Limón',
        theme_color: '#050805',
        background_color: '#050805',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Seafloor grids and reef/seamark GeoJSON (public/data/seafloor) are precached so depth works offline.
        globPatterns: ['**/*.{js,mjs,css,html,svg,woff,woff2,json,geojson,i16,u8,rle16,gz}'],
        // Forecast grids change every few hours; src/adapters/cache.ts keeps their offline copy (docs/DATA.md).
        globIgnores: ['**/data/forecast/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Map style, fonts and tiles cached as you browse (capped, oldest evicted). "Sync for trip" (PLAN 5.1,
        // src/offline/sync.ts) stores the whole region in `trip-v1`, which this route falls back to on a miss; its own
        // downloads carry `ftsync=1` and skip the route. The plugins run inside the service worker, so they are
        // self-contained (workbox-build copies their source).
        runtimeCaching: [
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
