import type { SubjectId } from "./tasks";

export const APP_NAME = "HUNDO";          // название на логотипе — меняется здесь
export const APP_VERSION = "3.0";

declare const __BUILD__: { version: string; date: string; message: string };
export const BUILD = __BUILD__;

export type Exam = "ЕГЭ" | "ОГЭ";

export const SUBJECTS: { id: SubjectId; name: string; short: string }[] = [
  { id: "rus", name: "Русский язык", short: "Русский" },
  { id: "math", name: "Математика", short: "Математика" },
  { id: "hist", name: "История", short: "История" },
  { id: "soc", name: "Обществознание", short: "Общество" },
  { id: "bio", name: "Биология", short: "Биология" },
  { id: "chem", name: "Химия", short: "Химия" },
  { id: "phys", name: "Физика", short: "Физика" },
];
export const SUBJ_NAME: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.id, s.name]));

export const ACCENTS = [
  { id: "mono", name: "Моно", color: "var(--fg)" },
  { id: "blue", name: "Синий", color: "#3d5afe" },
  { id: "red", name: "Красный", color: "#ff3b30" },
  { id: "orange", name: "Оранжевый", color: "#ff7a1a" },
  { id: "green", name: "Зелёный", color: "#1fc77e" },
  { id: "violet", name: "Фиолетовый", color: "#8b5cf6" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

export type Provider = "server" | "openrouter" | "openai" | "custom";
export const PRESETS: Record<Provider, { label: string; base: string; model: string }> = {
  server: { label: "Сервер HUNDO — без ключа", base: "/api", model: "" },
  openrouter: { label: "OpenRouter — свой ключ", base: "https://openrouter.ai/api/v1", model: "openrouter/free" },
  openai: { label: "OpenAI — свой ключ", base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  custom: { label: "Свой адрес", base: "", model: "" },
};

export const sdamUrl = (subj: string, exam: Exam) => `https://${subj}-${exam === "ОГЭ" ? "oge" : "ege"}.sdamgia.ru/`;
export const fipiBankUrl = (exam: Exam) => exam === "ОГЭ"
  ? "https://fipi.ru/oge/otkrytyy-bank-zadaniy-oge"
  : "https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege";
export const fipiDemoUrl = (exam: Exam) => exam === "ОГЭ"
  ? "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory"
  : "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory";
