import type { SubjectId } from "./tasks";
import { isEn } from "./i18n";

export const APP_NAME = "HUNDO";          // название на логотипе — меняется здесь
export const APP_VERSION = "3.0";

declare const __BUILD__: { version: string; date: string; message: string };
export const BUILD = __BUILD__;

export type Exam = "ЕГЭ" | "ОГЭ";

const SUBJ_DATA: { id: SubjectId; ru: string; ruShort: string; en: string; enShort: string }[] = [
  { id: "rus", ru: "Русский язык", ruShort: "Русский", en: "Russian language", enShort: "Russian" },
  { id: "math", ru: "Математика", ruShort: "Математика", en: "Mathematics", enShort: "Maths" },
  { id: "hist", ru: "История", ruShort: "История", en: "History", enShort: "History" },
  { id: "soc", ru: "Обществознание", ruShort: "Общество", en: "Social studies", enShort: "Social" },
  { id: "bio", ru: "Биология", ruShort: "Биология", en: "Biology", enShort: "Biology" },
  { id: "chem", ru: "Химия", ruShort: "Химия", en: "Chemistry", enShort: "Chemistry" },
  { id: "phys", ru: "Физика", ruShort: "Физика", en: "Physics", enShort: "Physics" },
];
/** Предметы на текущем языке (вызывать при отрисовке, а не один раз при загрузке) */
export const subjects = () => SUBJ_DATA.map(s => ({ id: s.id, name: isEn() ? s.en : s.ru, short: isEn() ? s.enShort : s.ruShort }));
export const subjName = (id: string) => { const s = SUBJ_DATA.find(x => x.id === id); return s ? (isEn() ? s.en : s.ru) : id; };
/** Название предмета по-русски — для промптов ИИ, где предмет должен совпадать с кодификатором */
export const subjNameRu = (id: string) => SUBJ_DATA.find(x => x.id === id)?.ru || id;
export const SUBJECT_IDS = SUBJ_DATA.map(s => s.id);

export const ACCENTS = [
  { id: "mono", name: "Моно", en: "Mono", color: "var(--fg)" },
  { id: "blue", name: "Синий", en: "Blue", color: "#3d5afe" },
  { id: "red", name: "Красный", en: "Red", color: "#ff3b30" },
  { id: "orange", name: "Оранжевый", en: "Orange", color: "#ff7a1a" },
  { id: "green", name: "Зелёный", en: "Green", color: "#1fc77e" },
  { id: "violet", name: "Фиолетовый", en: "Violet", color: "#8b5cf6" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

export type Provider = "server" | "odirouter" | "openrouter" | "openai" | "custom";
export const PRESETS: Record<Provider, { label: string; en: string; base: string; model: string }> = {
  server: { label: "Сервер HUNDO — без ключа", en: "HUNDO server — no key needed", base: "/api", model: "" },
  odirouter: { label: "OdiRouter — свой ключ", en: "OdiRouter — your own key", base: "https://api.odirouter.ai/v1", model: "free-gemini-2.5-flash" },
  openrouter: { label: "OpenRouter — свой ключ", en: "OpenRouter — your own key", base: "https://openrouter.ai/api/v1", model: "openrouter/free" },
  openai: { label: "OpenAI — свой ключ", en: "OpenAI — your own key", base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  custom: { label: "Свой адрес", en: "Custom endpoint", base: "", model: "" },
};

export const sdamUrl = (subj: string, exam: Exam) => `https://${subj}-${exam === "ОГЭ" ? "oge" : "ege"}.sdamgia.ru/`;
export const fipiBankUrl = (exam: Exam) => exam === "ОГЭ"
  ? "https://fipi.ru/oge/otkrytyy-bank-zadaniy-oge"
  : "https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege";
export const fipiDemoUrl = (exam: Exam) => exam === "ОГЭ"
  ? "https://fipi.ru/oge/demoversii-specifikacii-kodifikatory"
  : "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory";
