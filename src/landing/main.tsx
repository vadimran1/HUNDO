import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@/styles/globals.css";
import "./install";
import { isStandalone } from "./install";
import { Landing } from "./Landing";

// установленное приложение, открытое с главного экрана, сразу ведём внутрь
if (isStandalone()) location.replace("/app/");

// service worker нужен, чтобы сайт можно было установить; обновления показывает само приложение
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
