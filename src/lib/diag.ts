/**
 * Диагностика уровня: короткий тест по каждому предмету ученика.
 * Из банка берём по одному заданию с каждой темы (темы не повторяются),
 * по итогам — уровень предмета и слабые темы. Дальше это используют
 * варианты от ИИ, тренажёр и план подготовки.
 */
import { TASKS, localTask, type SubjectId, type Task } from "./tasks";
import { subjName, subjNameRu } from "./data";
import { isEn, L } from "./i18n";
import type { Diag, DiagLevel, DiagSubject } from "./store";

/** Сколько заданий на предмет: чем больше предметов, тем меньше на каждый — тест не дольше ~10 минут */
export const perSubject = (n: number) => (n <= 2 ? 5 : n === 3 ? 4 : 3);

export function buildDiag(subjects: SubjectId[]): Task[] {
  const k = perSubject(subjects.length);
  const out: Task[] = [];
  for (const s of subjects) {
    const pool = TASKS.filter(t => t.subj === s).sort(() => Math.random() - 0.5);
    const seen = new Set<string>();
    const pick: Task[] = [];
    for (const t of pool) if (!seen.has(t.topic) && pick.length < k) { seen.add(t.topic); pick.push(t); }
    for (const t of pool) if (pick.length < k && !pick.includes(t)) pick.push(t); // тем меньше, чем нужно — добираем
    out.push(...pick);
  }
  return out;
}

export function levelOf(correct: number, total: number): DiagLevel {
  const r = total ? correct / total : 0;
  return r >= 0.75 ? "high" : r >= 0.4 ? "mid" : "low";
}

export const levelName = (l: DiagLevel) =>
  l === "high" ? L("высокий", "high") : l === "mid" ? L("средний", "intermediate") : L("начальный", "beginner");

/** Темы заданий по id на текущем языке, без повторов */
export function topicsOf(ids: string[]) {
  const en = isEn();
  return [...new Set(ids.map(id => TASKS.find(t => t.id === id)).filter((t): t is Task => !!t).map(t => localTask(t, en).topic))];
}

export function summarize(tasks: Task[], ok: Record<string, boolean>, exam: Diag["exam"]): Diag {
  const subjects: Diag["subjects"] = {};
  for (const t of tasks) {
    const s: DiagSubject = subjects[t.subj] || { correct: 0, total: 0, level: "low", wrong: [], right: [] };
    s.total++;
    if (ok[t.id]) { s.correct++; s.right.push(t.id); } else s.wrong.push(t.id);
    subjects[t.subj] = s;
  }
  for (const k in subjects) { const s = subjects[k as SubjectId]!; s.level = levelOf(s.correct, s.total); }
  return { date: new Date().toISOString().slice(0, 10), exam, subjects };
}

/** Самый слабый предмет — с него стоит начать */
export function weakestSubject(d: Diag | null): SubjectId | null {
  if (!d) return null;
  const list = Object.entries(d.subjects) as [SubjectId, DiagSubject][];
  if (!list.length) return null;
  return list.sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0][0];
}

/** Темы, где ошибся на диагностике (на русском — для поиска в банке заданий) */
export function weakTopicsRu(d: Diag | null, subj?: SubjectId) {
  if (!d) return [] as string[];
  const ids = Object.entries(d.subjects).filter(([s]) => !subj || s === subj).flatMap(([, v]) => v!.wrong);
  return [...new Set(ids.map(id => TASKS.find(t => t.id === id)?.topic).filter((x): x is string => !!x))];
}

/** Строка для промпта варианта: уровень и слабые/сильные темы ученика */
export function personalBrief(d: Diag | null, subj: SubjectId, extraWeak: string[] = []): string {
  const s = d?.subjects[subj];
  const weak = [...new Set([...(s ? s.wrong.map(id => TASKS.find(t => t.id === id)?.topic || "") : []), ...extraWeak].filter(Boolean))];
  const strong = s ? [...new Set(s.right.map(id => TASKS.find(t => t.id === id)?.topic || "").filter(Boolean))] : [];
  if (!s && !weak.length) return "";
  if (isEn()) {
    const lvl = s ? { high: "high", mid: "intermediate", low: "beginner" }[s.level] : "unknown";
    return `\nPersonalise the paper for this student (${subjName(subj)} / ${subjNameRu(subj)}):
— level: ${lvl}${s ? ` (diagnostic: ${s.correct} of ${s.total} correct)` : ""};
— weak topics: ${weak.join(", ") || "not identified"} — make about half of the tasks on these topics;
— strong topics: ${strong.join(", ") || "not identified"} — at most one task on these;
— difficulty: ${s?.level === "low" ? "mostly basic tasks, the wording should lead step by step" : s?.level === "high" ? "mostly harder tasks of the advanced level" : "a mix of basic and intermediate tasks"}.`;
  }
  const lvl = s ? { high: "высокий", mid: "средний", low: "начальный" }[s.level] : "неизвестен";
  return `\nПодстрой вариант под ученика (${subjNameRu(subj)}):
— уровень: ${lvl}${s ? ` (диагностика: ${s.correct} из ${s.total} верно)` : ""};
— слабые темы: ${weak.join(", ") || "не определены"} — сделай примерно половину заданий по этим темам;
— сильные темы: ${strong.join(", ") || "не определены"} — по ним не больше одного задания;
— сложность: ${s?.level === "low" ? "в основном базовые задания, формулировки ведут по шагам" : s?.level === "high" ? "в основном задания повышенного уровня" : "смесь базовых заданий и заданий среднего уровня"}.`;
}

/** Короткая сводка диагностики для плана подготовки */
export function diagSummaryForPlan(d: Diag | null) {
  if (!d) return "";
  return Object.entries(d.subjects).map(([s, v]) => {
    const weak = [...new Set(v!.wrong.map(id => TASKS.find(t => t.id === id)?.topic).filter(Boolean))].join(", ");
    return isEn()
      ? `${subjName(s)}: ${v!.correct}/${v!.total}, level ${v!.level}${weak ? `, weak: ${weak}` : ""}`
      : `${subjNameRu(s)}: ${v!.correct}/${v!.total}, уровень ${{ high: "высокий", mid: "средний", low: "начальный" }[v!.level]}${weak ? `, слабые темы: ${weak}` : ""}`;
  }).join("; ");
}
