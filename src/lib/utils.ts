import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type React from "react";
import { locale } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function normalize(s: string) {
  return String(s).toLowerCase().trim()
    .replace(/ё/g, "е")
    .replace(/[‐-―]/g, "-")
    .replace(/[.,;:!?"'«»()]/g, "")
    .replace(/\s+/g, " ");
}

export function isCorrect(answers: string[], given: string) {
  const g = normalize(given);
  return !!g && answers.some(a => normalize(a) === g);
}

export function daysLeft(iso: string) {
  const d = new Date(iso + "T09:00:00");
  return isNaN(+d) ? null : Math.max(0, Math.ceil((+d - Date.now()) / 864e5));
}

export function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return isNaN(+d) ? "—" : d.toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
}

/** С сентября готовимся к экзамену следующего года */
export function examYear() {
  const n = new Date();
  return n.getFullYear() + (n.getMonth() >= 8 ? 1 : 0);
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Клетки бланка ужимаются, чтобы длинный ответ помещался целиком */
export function cellStyle(len: number): React.CSSProperties {
  if (len <= 11) return {};
  if (len <= 15) return { ["--cell" as string]: "23px", fontSize: "16px" };
  return { ["--cell" as string]: "18px", fontSize: "13px" };
}

/**
 * Нейросеть иногда пишет формулы в LaTeX ($3x - 7 = 14$, \frac{a}{b}, \cdot).
 * Перед показом превращаем самое частое в обычные символы.
 */
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", n: "ⁿ" };
export function prettyMath(s: string) {
  if (!s || !/[$\\^]/.test(s)) return s;
  return s
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\$+/g, "")
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a: string, b: string) => {
      const simple = (x: string) => /^[\p{L}\d.,]+$/u.test(x.trim());
      return `${simple(a) ? a.trim() : `(${a})`}/${simple(b) ? b.trim() : `(${b})`}`;
    })
    .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
    .replace(/\\(cdot|times)/g, (_, k) => (k === "cdot" ? "·" : "×"))
    .replace(/\\(le|leq)\b/g, "≤").replace(/\\(ge|geq)\b/g, "≥").replace(/\\(ne|neq)\b/g, "≠")
    .replace(/\\pm\b/g, "±").replace(/\\pi\b/g, "π").replace(/\\alpha\b/g, "α").replace(/\\Delta\b/g, "Δ").replace(/\\to\b|\\rightarrow\b/g, "→")
    .replace(/\\text\{([^{}]*)\}/g, "$1").replace(/\\(left|right)/g, "")
    .replace(/\^\{([0-9n-]+)\}|\^([0-9n])/g, (_, a, b) => [...(a || b)].map(ch => SUP[ch] || ch).join(""))
    .replace(/_\{([^{}]*)\}/g, "$1")
    .replace(/\\,|\;|\\!/g, " ");
}
