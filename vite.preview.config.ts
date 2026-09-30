// Сборка предпросмотра: всё приложение в один HTML-файл (для показа по ссылке без хостинга)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

export default defineConfig({
  base: "./",
  define: { __BUILD__: JSON.stringify({ version: "preview", date: "", message: "" }) },
  resolve: {
    alias: {
      "virtual:pwa-register/react": path.resolve(import.meta.dirname, "src/preview/pwa-stub.ts"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "dist-preview",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: path.resolve(import.meta.dirname, "app/index.html") },
  },
});
