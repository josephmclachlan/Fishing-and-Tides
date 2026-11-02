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
        // Map tiles/styles cached as you browse; full region pre-download comes with "Sync for trip" (PLAN 5.1).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 3000 } },
          },
        ],
      },
    }),
  ],
});
