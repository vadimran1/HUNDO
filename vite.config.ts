import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// Версия сборки. На Vercel берётся из коммита: каждый push → новая версия →
// новый service worker → в приложении появляется плашка «Вышла новая версия».
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "local-" + Date.now().toString(36);
const message = (process.env.VERCEL_GIT_COMMIT_MESSAGE || "").split("\n")[0].trim().slice(0, 140);
const date = new Date().toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long", year: "numeric" });
const BUILD = { version: sha, date, message };

// version.json — его читает плашка обновления, чтобы показать текст коммита
function versionFile(): Plugin {
  return {
    name: "sotka-version",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ ...BUILD, built: new Date().toISOString() }, null, 2) });
    },
  };
}

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  plugins: [
    react(),
    tailwindcss(),
    versionFile(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icons/*.png"],
      manifest: {
        id: "/app/",
        name: "HUNDO — ИИ-помощник по ЕГЭ и ОГЭ",
        short_name: "HUNDO",
        description: "ИИ-репетитор для подготовки к ЕГЭ и ОГЭ: варианты в формате ФИПИ, проверка ответов, разбор ошибок",
        lang: "ru",
        start_url: "/app/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        categories: ["education"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          { src: "/screens/ru/home.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "Главная: дни до экзамена" },
          { src: "/screens/ru/variant.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "Вариант от ИИ с проверкой" },
          { src: "/screens/ru/chat.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "ИИ-репетитор разбирает ошибку" },
          { src: "/screens/ru/desktop-home.webp", sizes: "1920x1200", type: "image/webp", form_factor: "wide", label: "Версия для компьютера" },
        ],
        shortcuts: [
          { name: "Вариант от ИИ", short_name: "Вариант", url: "/app/#variant", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Спросить ИИ", short_name: "ИИ", url: "/app/#chat", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Тренажёр", url: "/app/#train", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webp}"],
        // в офлайн-кэш — только кириллица и латиница, остальные наборы шрифтов браузер не скачивает
        globIgnores: ["**/*-{vietnamese,greek,greek-ext,math,symbols,latin-ext,cyrillic-ext}-wght-*.woff2", "screens/**", "promo/**"],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        ignoreURLParametersMatching: [/.*/],
        maximumFileSizeToCacheInBytes: 3_000_000,
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        app: path.resolve(import.meta.dirname, "app/index.html"),
      },
    },
  },
});
