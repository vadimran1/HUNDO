import { useEffect, useReducer } from "react";

/** Событие, которое Chrome/Edge/Яндекс Браузер присылают, когда сайт можно установить */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
let installed = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());

// Слушаем сразу при загрузке модуля, чтобы не пропустить событие до отрисовки React
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e as InstallPromptEvent; notify(); });
addEventListener("appinstalled", () => { deferred = null; installed = true; notify(); });

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function useInstall() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  return {
    canPrompt: !!deferred,
    installed,
    async prompt() {
      if (!deferred) return false;
      const e = deferred;
      await e.prompt();
      const { outcome } = await e.userChoice;
      deferred = null;
      if (outcome === "accepted") installed = true;
      notify();
      return outcome === "accepted";
    },
  };
}
