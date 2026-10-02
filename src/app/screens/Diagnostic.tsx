import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { useApp, useUI, type Diag } from "@/lib/store";
import { localTask, type SubjectId, type Task } from "@/lib/tasks";
import { subjName } from "@/lib/data";
import { useT, pl } from "@/lib/i18n";
import { buildDiag, levelName, perSubject, summarize, topicsOf, weakestSubject } from "@/lib/diag";
import { cellStyle, cn, isCorrect } from "@/lib/utils";
import { shake } from "@/lib/fx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/controls";
import { TaskText } from "@/components/TaskText";

/**
 * Диагностика знаний: по 3–5 коротких заданий на каждый предмет ученика.
 * Ответы не разбираем по ходу, чтобы не подсказывать, — итог в конце:
 * уровень по предмету, слабые и сильные темы, дальше персональный вариант.
 */
export function Diagnostic() {
  const close = () => { useUI.setState({ overlay: null }); window.scrollTo(0, 0); };
  const subjects = useApp(s => s.subjects);
  const exam = useApp(s => s.exam);
  const t = useT();
  const [phase, setPhase] = useState<"intro" | "test" | "done">("intro");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [i, setI] = useState(0);
  const [ok, setOk] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Diag | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, []);

  const start = () => { setTasks(buildDiag(subjects)); setI(0); setOk({}); setPhase("test"); };
  const answer = (task: Task, right: boolean) => {
    const next = { ...ok, [task.id]: right };
    setOk(next);
    useApp.getState().record(task.subj, right, task.id);
    if (i + 1 < tasks.length) setI(i + 1);
    else {
      const d = summarize(tasks, next, exam);
      useApp.getState().patch({ diag: d });
      setResult(d); setPhase("done");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-bg pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto max-w-[560px] px-4 pb-10 lg:max-w-[720px]">
        <div className="flex items-center gap-3 pt-4 pb-2">
          <span className="font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
            <b className="font-bold text-fg">{t("Диагностика", "Diagnostic")}</b>
            {phase === "test" && <> · {i + 1}/{tasks.length}</>}
          </span>
          <span className="flex-1" />
          <button aria-label={t("Закрыть", "Close")} onClick={close} className="grid size-9 place-items-center rounded-xl text-fg-3 hover:bg-bg-2 hover:text-fg"><X className="size-5" /></button>
        </div>
        {phase === "test" && (
          <div className="mb-2 h-[3px] overflow-hidden rounded-sm bg-line">
            <motion.div className="h-full origin-left bg-accent" animate={{ scaleX: i / Math.max(tasks.length, 1) }} transition={{ duration: 0.4 }} />
          </div>
        )}
        <AnimatePresence mode="wait">
          {phase === "intro" && <Intro key="intro" onStart={start} onSkip={close} n={subjects.length} />}
          {phase === "test" && tasks[i] && <Question key={tasks[i].id} task={tasks[i]} onAnswer={answer} />}
          {phase === "done" && result && <Result key="done" d={result} onClose={close} onRetry={start} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.25 } };

function Intro({ onStart, onSkip, n }: { onStart: () => void; onSkip: () => void; n: number }) {
  const t = useT();
  const total = perSubject(n) * n;
  const had = !!useApp.getState().diag;
  return (
    <motion.div {...fade} className="pt-8">
      <h2 className="mb-3 font-display text-[clamp(26px,7vw,36px)] leading-[1.1] font-bold tracking-[-.02em]">
        {t("Узнаем, что вы уже знаете", "Let's see what you already know")}
      </h2>
      <p className="mb-6 text-fg-2">
        {t(`${total} ${pl(total, ["короткое задание", "коротких задания", "коротких заданий"], ["short task", "short tasks"])} по вашим предметам, примерно ${Math.ceil(total * 0.7)} минут. Разбор — в конце. Если не знаете ответа, жмите «Не знаю»: так результат будет точнее.`,
          `${total} short tasks across your subjects, about ${Math.ceil(total * 0.7)} minutes. Solutions come at the end. If you don't know an answer, tap “Don't know” — the result will be more accurate.`)}
      </p>
      <div className="mb-7 grid gap-2.5">
        {[
          [t("Уровень по каждому предмету", "Your level in each subject"), t("начальный, средний или высокий", "beginner, intermediate or high")],
          [t("Слабые темы", "Weak topics"), t("на них будет половина заданий в вариантах от ИИ", "half of the AI mock-exam tasks will target them")],
          [t("Тренажёр и план под вас", "Trainer and plan made for you"), t("сначала задания по темам, где ошиблись", "tasks on the topics you missed come first")],
        ].map(([a, b], k) => (
          <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + k * 0.07 }}
            className="flex items-start gap-3 rounded-[14px] border border-line-2 p-3.5">
            <span className="mt-[3px] grid size-5 flex-none place-items-center rounded-full bg-accent font-mono text-[11px] font-bold text-on-accent">{k + 1}</span>
            <span><b className="block text-[14.5px] font-semibold">{a}</b><span className="text-[13px] text-fg-3">{b}</span></span>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1 sm:flex-none sm:min-w-[240px]" onClick={onStart}>{had ? t("Пройти заново", "Retake") : t("Начать", "Start")} <ArrowRight /></Button>
        <Button size="lg" variant="outline" onClick={onSkip}>{had ? t("Закрыть", "Close") : t("Пропустить", "Skip for now")}</Button>
      </div>
    </motion.div>
  );
}

function Question({ task: raw, onAnswer }: { task: Task; onAnswer: (t: Task, ok: boolean) => void }) {
  const t = useT();
  const task = localTask(raw, t.en);
  const [given, setGiven] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (matchMedia("(pointer:fine)").matches) input.current?.focus(); }, []);
  const submit = () => {
    if (!given.trim()) { shake(input.current); input.current?.focus(); return; }
    onAnswer(raw, isCorrect(task.answers, given));
  };
  return (
    <motion.div {...fade} className="pt-6">
      <div className="mb-3.5 flex flex-wrap items-center gap-2 font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
        <b className="font-bold text-fg">{subjName(task.subj)}</b><span className="h-px w-3.5 bg-line-2" /><span>{task.topic}</span>
      </div>
      <TaskText text={task.q} className="mb-5 text-[19px] leading-[1.45] font-medium text-pretty lg:text-[23px]" />
      <label className="mb-3 block">
        <Label>{t("Ответ", "Answer")}</Label>
        <input ref={input} className="cells" style={cellStyle(given.length)} value={given} autoComplete="off" autoCapitalize="off" spellCheck={false}
          placeholder={t("Введите ответ", "Type your answer")} onChange={e => setGiven(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); }} />
      </label>
      <div className="flex gap-2">
        <Button className="flex-1 sm:flex-none sm:min-w-[200px]" onClick={submit}>{t("Ответить", "Answer")} <ArrowRight /></Button>
        <Button variant="outline" onClick={() => onAnswer(raw, false)}>{t("Не знаю", "Don't know")}</Button>
      </div>
    </motion.div>
  );
}

const LEVEL_W = { low: 0.33, mid: 0.66, high: 1 } as const;

function Result({ d, onClose, onRetry }: { d: Diag; onClose: () => void; onRetry: () => void }) {
  const t = useT();
  const weakest = weakestSubject(d);
  const list = useMemo(() => Object.entries(d.subjects) as [SubjectId, NonNullable<Diag["subjects"][SubjectId]>][], [d]);
  const all = list.reduce((a, [, s]) => [a[0] + s.correct, a[1] + s.total], [0, 0]);
  const toVariant = (subj: SubjectId | null) => {
    // проверенный старый вариант убираем, чтобы сразу открылся выбор нового; начатый — не трогаем
    if (useApp.getState().variant?.done) useApp.getState().patch({ variant: null });
    useUI.setState({ overlay: null, variantSubj: subj });
    useUI.getState().go("variant"); window.scrollTo(0, 0);
  };
  return (
    <motion.div {...fade} className="pt-6">
      <Label>{t("Результат", "Result")}</Label>
      <h2 className="mb-2 font-display text-[clamp(26px,7vw,36px)] leading-[1.1] font-bold tracking-[-.02em]">
        {all[0]} {t("из", "of")} {all[1]} {t("верно", "correct")}
      </h2>
      <p className="mb-6 text-fg-2">
        {weakest
          ? t(`Начните с предмета «${subjName(weakest)}» — там больше всего пробелов. Варианты, тренажёр и план теперь учитывают ваши слабые темы.`,
              `Start with ${subjName(weakest)} — that's where the gaps are biggest. Mock exams, the trainer and your plan now take your weak topics into account.`)
          : ""}
      </p>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {list.map(([id, s], k) => {
          const weak = topicsOf(s.wrong), strong = topicsOf(s.right);
          return (
            <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * k }}
              className="min-w-0 rounded-[14px] border border-line-2 p-4">
              <div className="mb-2 flex items-baseline gap-2">
                <b className="text-[15px] font-semibold">{subjName(id)}</b>
                <span className="flex-1" />
                <span className="font-mono text-[12.5px] text-fg-3">{s.correct}/{s.total}</span>
              </div>
              <div className="mb-1.5 h-[5px] overflow-hidden rounded-full bg-line">
                <motion.div className={cn("h-full rounded-full", s.level === "low" ? "bg-fg-3" : "bg-accent")}
                  initial={{ width: 0 }} animate={{ width: `${LEVEL_W[s.level] * 100}%` }} transition={{ delay: 0.2 + 0.08 * k, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
              </div>
              <p className="mb-2.5 text-[12.5px] text-fg-3">{t("Уровень", "Level")}: <b className="text-fg">{levelName(s.level)}</b></p>
              {weak.length > 0 && <p className="text-[13px] text-fg-2"><span className="text-fg-3">{t("Подтянуть", "To work on")}:</span> {weak.join(", ")}</p>}
              {strong.length > 0 && <p className="mt-1 text-[13px] text-fg-2"><span className="text-fg-3">{t("Уже хорошо", "Already good")}:</span> {strong.join(", ")}</p>}
            </motion.div>
          );
        })}
      </div>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button size="lg" className="sm:min-w-[240px]" onClick={() => toVariant(weakest)}>{t("Персональный вариант", "Personal mock exam")} <ArrowRight /></Button>
        <Button size="lg" variant="outline" onClick={() => { onClose(); useUI.getState().openSheet("plan"); }}>{t("План от ИИ", "AI study plan")}</Button>
        <Button size="lg" variant="ghost" onClick={onRetry}>{t("Пройти заново", "Retake")}</Button>
      </div>
    </motion.div>
  );
}
