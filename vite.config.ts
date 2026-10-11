import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "node:fs";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  plugins: [
    react(),
    {
      name: "marketplace-directory-index",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (/^\/marketplace\/?(?:\?.*)?$/.test(request.url || "")) {
            request.url = "/marketplace/index.html";
          }
          next();
        });
      },
    },
    {
      name: "clear-preview-worker-in-dev",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/sw.js", (_request, response) => {
          response.setHeader("Content-Type", "application/javascript");
          response.setHeader("Cache-Control", "no-store");
          response.end(`
            self.addEventListener("install", () => self.skipWaiting());
            self.addEventListener("activate", event => event.waitUntil((async () => {
              await self.registration.unregister();
              for (const client of await self.clients.matchAll({ type: "window" })) {
                await client.navigate(client.url);
              }
            })()));
          `);
        });
      },
    },
    {
      name: "serve-onnx-runtime-in-dev",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/ort-wasm-simd-threaded.mjs", (_request, response) => {
          response.setHeader("Content-Type", "text/javascript");
          response.end(readFileSync(path.resolve(__dirname, "public/ort-wasm-simd-threaded.mjs")));
        });
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["alusathi-icon.svg", "pwa-192x192.png", "pwa-512x512.png", "robots.txt"],
      manifest: {
        name: "AluSathi FieldWatch",
        short_name: "AluSathi",
        description: "Bangla-first potato leaf screening and whole-field checks for Bangladesh farmers",
        theme_color: "#112a20",
        background_color: "#f7f1df",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        importScripts: ["/push-events.js"],
        globPatterns: ["**/*.{js,mjs,css,html,ico,svg,woff2,json}"],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && (/^\/models\/.*\.onnx$/.test(url.pathname) || /^\/ort-wasm.*\.wasm$/.test(url.pathname)),
            handler: "CacheFirst",
            options: { cacheName: "ml-assets", cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && /\.(png|webp)$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "images", expiration: { maxEntries: 40 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /^https:\/\/(api|geocoding-api)\.open-meteo\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    conditions: ["onnxruntime-web-use-extern-wasm"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
