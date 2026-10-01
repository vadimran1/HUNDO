import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Язык интерфейса: русский или английский. Общий для сайта и приложения.
 * Переводы пишутся прямо в коде парами: t("Главная", "Home") — так текст
 * и перевод всегда рядом и ничего не теряется.
 * Выбор: ?lang=en в адресе, путь /en, сохранённый выбор; по умолчанию русский.
 */
export type Lang = "ru" | "en";

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "ru") return q;
    if (/^\/en(\/|$)/.test(location.pathname)) return "en";
    const saved = JSON.parse(localStorage.getItem("hundo-lang") || "null")?.state?.lang;
    if (saved === "en" || saved === "ru") return saved;
  } catch { /* нет доступа к хранилищу */ }
  // по умолчанию русский: экзамены российские; английский — переключателем RU/EN или по адресу /en
  return "ru";
}

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist(
    set => ({ lang: initialLang(), setLang: lang => { set({ lang }); syncDoc(lang); } }),
    { name: "hundo-lang", partialize: s => ({ lang: s.lang }), merge: (_p, s) => ({ ...s, lang: initialLang() }) },
  ),
);

function syncDoc(l: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  // адресная строка: ?lang=en оставляем только для английского
  try {
    const u = new URL(location.href);
    u.searchParams.delete("lang");
    // на сайте адрес следует за языком: / — русский, /en — английский
    if (l === "ru" && /^\/en\/?$/.test(u.pathname)) u.pathname = "/";
    else if (l === "en" && u.pathname === "/") u.pathname = "/en";
    if (u.href !== location.href) history.replaceState(null, "", u);
  } catch { /* ignore */ }
}
syncDoc(useLang.getState().lang);

/** Текст на текущем языке — вне компонентов (промпты, ошибки) */
export const L = (ru: string, en: string) => (useLang.getState().lang === "en" ? en : ru);
export const isEn = () => useLang.getState().lang === "en";

/** Хук: t(ru, en) с подпиской на смену языка */
export function useT() {
  const lang = useLang(s => s.lang);
  const t = (ru: string, en: string) => (lang === "en" ? en : ru);
  return Object.assign(t, { lang, en: lang === "en" });
}

/** Множественное число: рус. (1, 2–4, 5+) и англ. (1, остальные) */
export function pl(n: number, ru: [string, string, string], en: [string, string]) {
  if (isEn()) return n === 1 ? en[0] : en[1];
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return ru[2];
  if (b > 1 && b < 5) return ru[1];
  if (b === 1) return ru[0];
  return ru[2];
}

/** ЕГЭ/ОГЭ для отображения */
export const examLabel = (exam: string) => (isEn() ? (exam === "ОГЭ" ? "OGE" : "EGE") : exam);
export const examFull = (exam: string) => isEn()
  ? (exam === "ОГЭ" ? "OGE (Basic State Exam)" : "EGE (Unified State Exam)")
  : exam;
export const locale = () => (isEn() ? "en-GB" : "ru-RU");
