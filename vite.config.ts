import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "YouTube Jam",
        short_name: "YT Jam",
        description: "Collaborative YouTube video watching app",
        display: "standalone",
        scope: "/",
        start_url: "/",
        theme_color: "#111827", // Gray-900 from the UI
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "favicon",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "favicon",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "apple touch icon",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Enable background media sync and audio playback
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.youtube\.com\/iframe_api/,
            handler: "CacheFirst",
            options: {
              cacheName: "youtube-api-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "youtube-thumbnails-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        // Don't precache YouTube iframes as they're dynamic
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif}"],
        globIgnores: ["**/node_modules/**"],
        // Handle background audio playback
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
