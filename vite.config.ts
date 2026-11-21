/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Use a relative base so the build works on GitHub Pages project sites and on root hosts.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 'prompt' lets the app show "Update available, Reload" (AC-APP-11) without losing input.
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg', 'icons/favicon.ico', 'icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Nestwise',
        short_name: 'Nestwise',
        description: 'Bills, household chores and savings goals in one calm app.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#fbf6ef',
        theme_color: '#fbf6ef',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app shell so every P0 feature works offline (AC-APP-10).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    projects: [
      // Pure logic (src/lib, store, helpers): no DOM.
      { extends: true, test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
      // Components and screens: jsdom + Testing Library.
      { extends: true, test: { name: 'ui', environment: 'jsdom', include: ['src/**/*.test.tsx'], setupFiles: ['src/test/setup.ts'] } },
    ],
  },
});
