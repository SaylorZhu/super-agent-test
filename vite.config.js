import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // three.js is a single large dependency; the compressed bundle is ~157 kB.
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
