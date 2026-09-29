import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type React from "react";

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
  return isNaN(+d) ? "—" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
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
