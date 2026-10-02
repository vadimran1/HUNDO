import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus, Minus } from "lucide-react";
import { useApp, useUI, type VTask, type Variant } from "@/lib/store";
import { subjName, subjNameRu, fipiBankUrl, sdamUrl } from "@/lib/data";
import { useT, L, isEn, pl, examLabel } from "@/lib/i18n";
import { askAI, aiErrorText, AIError, useAiReady } from "@/lib/ai";
import { burst, shake } from "@/lib/fx";
import { cellStyle, cn, examYear, isCorrect, prettyMath } from "@/lib/utils";
import { TASKS, type SubjectId } from "@/lib/tasks";
import { levelName, personalBrief, weakestSubject } from "@/lib/diag";
import { Button } from "@/components/ui/button";
import { Chip, Label, Segmented, Switch, Verdict } from "@/components/ui/controls";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { TaskText } from "@/components/TaskText";

function variantPrompt(exam: string, subj: string, count: number, withOpen: boolean) {
  if (isEn()) return `Create a practice version of the Russian ${exam} ${examYear()} exam (${examLabel(exam)}) in the subject "${subjNameRu(subj)}" (${subjName(subj)}).
Requirements:
— ${count} short-answer tasks in the Part 1 format of the current FIPI codifier and specification;
— different topics and difficulty levels, ordered as in a real exam paper;
— write every task, topic and explanation in English${subj === "rus" ? ", but keep the Russian words, sentences and spelling rules being tested in Russian" : ""};
— each answer must be a number, word, short phrase or digit sequence that can be checked automatically;
— if the task asks to choose numbers, list the options in the task text as 1), 2), 3)…;
${withOpen ? `— add 1 extended-answer task at the end (like Part 2); put the model answer and marking criteria in "answer" and the maximum score in "max";\n` : ""}— use only verified facts, dates and formulas; do not invent events.

Return ONLY a JSON array, no comments and no markdown:
[{"n":1,"type":"short","topic":"codifier topic","q":"task text","answer":"correct answer","alt":["other accepted spellings"],"max":1,"exp":"solution in 2–3 sentences"}]
For the extended-answer task use "type":"open".`;
  return `Составь тренировочный вариант ${exam}-${examYear()} по предмету «${subjNameRu(subj)}».
Требования:
— ${count} заданий с кратким ответом в формате части 1 по актуальному кодификатору и спецификации ФИПИ;
— задания разных тем и разного уровня сложности, порядок как в настоящем варианте;
— ответ каждого задания — число, слово, словосочетание или последовательность цифр, который однозначно проверяется автоматически;
— если в задании нужно выбрать номера, перечисли варианты в тексте задания с номерами 1), 2), 3)…;
${withOpen ? `— добавь в конец 1 задание с развёрнутым ответом (как в части 2), для него в "answer" запиши эталон и критерии оценивания, в "max" — максимальный балл;\n` : ""}— факты, даты и формулы только проверенные; не придумывай несуществующих событий.

Верни ТОЛЬКО JSON-массив, без пояснений и без markdown:
[{"n":1,"type":"short","topic":"тема по кодификатору","q":"текст задания","answer":"правильный ответ","alt":["другие допустимые записи ответа"],"max":1,"exp":"разбор решения в 2–3 предложениях"}]
Для задания с развёрнутым ответом "type":"open".`;
}

function parseVariant(text: string): VTask[] {
  const t = text.replace(/```(?:json)?/gi, "");
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a < 0 || b <= a) throw new Error(L("ИИ вернул ответ не в том формате. Попробуйте ещё раз.", "The AI replied in the wrong format. Please try again."));
  let arr: unknown;
  try { arr = JSON.parse(t.slice(a, b + 1)); } catch { throw new Error(L("ИИ прислал вариант с ошибкой в разметке. Нажмите «Составить вариант» ещё раз.", "The AI sent a paper with broken formatting. Press “Create mock exam” again.")); }
  const tasks = (Array.isArray(arr) ? arr : []).filter((x: any) => x && x.q && x.answer).map((x: any, i: number): VTask => ({
    n: i + 1, type: x.type === "open" ? "open" : "short", topic: String(x.topic || L("Задание", "Task")), q: String(x.q),
    answer: String(x.answer), alt: Array.isArray(x.alt) ? x.alt.map(String) : [],
    max: Math.max(1, parseInt(x.max, 10) || 1), exp: String(x.exp || ""),
  }));
  if (!tasks.length) throw new Error(L("В ответе ИИ не нашлось заданий. Попробуйте ещё раз.", "No tasks found in the AI reply. Please try again."));
  return tasks;
}

export function VariantScreen() {
  const variant = useApp(s => s.variant);
  return variant ? <Solve v={variant} /> : <Setup />;
}

function Setup() {
  const { subjects, exam, patch, diag, weakAI, answered } = useApp();
  const ready = useAiReady();
  // с итогов диагностики приходит предмет, с которого стоит начать; иначе — самый слабый
  const [subj, setSubj] = useState<SubjectId>(() => {
    const want = useUI.getState().variantSubj || weakestSubject(diag);
    useUI.setState({ variantSubj: null });
    return want && subjects.includes(want) ? want : subjects[0] || "hist";
  });
  // слабые темы предмета: ошибки диагностики + ошибки в тренажёре и прошлых вариантах
  const extraWeak = [
    ...weakAI.filter(w => w.subj === subj).map(w => w.topic),
    ...Object.keys(answered).filter(id => answered[id] === false).map(id => TASKS.find(x => x.id === id)).filter(x => x?.subj === subj).map(x => x!.topic),
  ];
  const canPersonal = !!diag?.subjects[subj] || extraWeak.length > 0;
  const [personal, setPersonal] = useState(true);
  const usePersonal = personal && canPersonal;
  const [count, setCount] = useState<"5" | "10" | "15">("10");
  const [open, setOpen] = useState(true);
  const [examMode, setExamMode] = useState(false);
  const minutes = examMinutes(+count, open);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const errRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const generate = async () => {
    setBusy(true); setErr(""); setLog([t("подключаюсь к нейросети", "connecting to the AI")]);
    let acc = "", lastN = 0;
    try {
      const text = await askAI([{ role: "user", content: variantPrompt(exam, subj, +count, open) + (usePersonal ? personalBrief(diag, subj, extraWeak) : "") }], d => {
        if (!acc) setLog(l => [...l, t("нейросеть пишет задания", "the AI is writing tasks")]);
        acc += d;
        const n = (acc.match(/"q"\s*:/g) || []).length;
        if (n > lastN) { lastN = n; setLog(l => [...l, `> ${t("задание", "task")} ${String(n).padStart(2, "0")} ${t("готово", "ready")}`]); }
      });
      setLog(l => [...l, t("проверяю формат", "checking the format")]);
      const tasks = parseVariant(text);
      const mins = examMinutes(tasks.filter(x => x.type === "short").length, tasks.some(x => x.type === "open"));
      patch({ variant: { subj, exam, created: Date.now(), tasks, given: {}, results: {}, done: false, ...(examMode ? { timer: { minutes: mins, startedAt: Date.now() } } : {}) } });
    } catch (e) {
      setBusy(false);
      setErr(e instanceof AIError ? aiErrorText(e) : (e as Error).message);
      setTimeout(() => shake(errRef.current), 50);
    }
  };

  if (busy) return (
    <div className="pt-5 lg:max-w-[720px]">
      <Meta items={[subjName(subj), `${count} ${pl(+count, ["задание", "задания", "заданий"], ["task", "tasks"])}`]} />
      <h2 className="font-display text-[28px] font-bold tracking-[-.02em] lg:text-[40px]">{t("Собираю вариант", "Building your paper")}</h2>
      <div className="relative mt-3 h-0.5 overflow-hidden bg-line"><i className="absolute inset-y-0 w-[30%] animate-[scan_1.3s_cubic-bezier(.2,.8,.2,1)_infinite] bg-accent" /></div>
      <div className="mt-3.5 font-mono text-xs leading-[1.7] text-fg-2">
        <AnimatePresence initial={false}>
          {log.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
              {l}{i === log.length - 1 && <span className="text-accent [animation:blink_1s_steps(2)_infinite]">▍</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-6 space-y-2.5">
        {[92, 70, 84, 58, 76].map((w, i) => (
          <motion.div key={i} className="h-3.5 rounded bg-bg-2" style={{ width: `${w}%` }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="pt-5 lg:grid lg:grid-cols-[1fr_340px] lg:gap-14 lg:pt-10">
      <div>
        <Meta items={[t("Вариант от ИИ", "AI mock exam"), `${examLabel(exam)} ${examYear()}`]} />
        <h2 className="font-display text-[clamp(22px,6.4vw,28px)] leading-[1.15] font-bold tracking-[-.02em] lg:text-[40px] lg:leading-[1.08]">{t("Нейросеть составит вариант, проверит и разберёт ошибки", "The AI writes a paper, marks it and explains every mistake")}</h2>

        <div className="mt-6 lg:mt-9"><Label>{t("Предмет", "Subject")}</Label>
          <div className="flex flex-wrap gap-2">{subjects.map(id => <Chip key={id} pressed={id === subj} onClick={() => setSubj(id)}>{subjName(id)}</Chip>)}</div>
        </div>
        <div className="mt-5 lg:max-w-[360px]"><Label>{t("Сколько заданий", "Number of tasks")}</Label>
          <Segmented id="vcount" value={count} onChange={v => setCount(v)} items={[["5", "5"], ["10", "10"], ["15", "15"]]} />
        </div>
        <div className="mt-5">
          {canPersonal ? (
            <Switch checked={personal} onChange={setPersonal}>
              {diag?.subjects[subj]
                ? t(`Под мой уровень: ${levelName(diag.subjects[subj]!.level)}, больше заданий по слабым темам`, `Fit to my level: ${levelName(diag.subjects[subj]!.level)}, more tasks on weak topics`)
                : t("Под меня: больше заданий по темам, где я ошибался", "Made for me: more tasks on topics I got wrong")}
            </Switch>
          ) : (
            <button onClick={() => useUI.setState({ overlay: "diag" })} className="group flex w-full items-center gap-2 rounded-xl border border-dashed border-line-2 px-3.5 py-3 text-left text-[13.5px] text-fg-2 hover:border-fg hover:text-fg">
              <span className="flex-1">{t("Пройдите диагностику — и вариант подстроится под ваш уровень", "Take the diagnostic and the paper will fit your level")}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
        <div className="mt-4"><Switch checked={open} onChange={setOpen}>{t("Задание с развёрнутым ответом — ИИ оценит его по критериям", "Extended-answer task — the AI marks it against the criteria")}</Switch></div>
        <div className="mt-4"><Switch checked={examMode} onChange={setExamMode}>
          {t(`Режим экзамена: таймер на ${minutes} мин, по окончании времени вариант сдаётся сам`, `Exam mode: a ${minutes}-minute timer, the paper is handed in when time runs out`)}
        </Switch></div>

        <Button className="mt-6 w-full lg:w-auto lg:min-w-[280px]" size="lg" disabled={!ready} onClick={generate}>{ready ? <>{t("Составить вариант", "Create mock exam")} <ArrowRight /></> : t("ИИ не подключён — см. настройки", "AI not connected — see Settings")}</Button>
        {err && <div ref={errRef} className="hatch mt-3 rounded-xl border border-line-2 px-4 py-3 text-[13.5px]">{err}</div>}
        <p className="mt-3.5 text-xs leading-normal text-fg-3">
          {t("Задания составляет нейросеть, в них бывают неточности. Официальные задания — в ", "Tasks are written by AI and may contain mistakes. Official tasks are in the ")}<a className="link-u text-fg" href={fipiBankUrl(exam)} target="_blank" rel="noopener">{t("банке ФИПИ", "FIPI bank")}</a>{t(" и на ", " and on ")}
          <a className="link-u text-fg" href={sdamUrl(subj, exam)} target="_blank" rel="noopener">{t("Сдам ГИА", "Sdam GIA")}</a>.
        </p>
      </div>
      <aside className="mt-8 hidden self-start rounded-[18px] border border-line p-6 lg:mt-0 lg:block">
        <p className="font-mono text-[12px] tracking-[.12em] text-fg-3 uppercase">{t("Как это работает", "How it works")}</p>
        <ol className="mt-4 grid gap-4">
          {[
            [t("Составление", "Writing"), t("ИИ подбирает задания по кодификатору ФИПИ", "The AI picks tasks following the FIPI codifier")],
            [t("Решение", "Solving"), t("ответы в клеточки, как в бланке; всё сохраняется", "answers go in boxes like the real form; progress is saved")],
            [t("Проверка", "Marking"), t("часть 1 — автоматически, часть 2 — ИИ по критериям", "Part 1 is auto-checked, Part 2 is marked by AI against criteria")],
            [t("Разбор", "Review"), t("к каждой ошибке — объяснение и вопрос ИИ", "every mistake gets an explanation and a follow-up with the AI")],
          ].map(([a, b], i) => (
            <li key={a} className="flex gap-3.5">
              <span className="w-7 flex-none font-display text-[18px] leading-none font-black text-fg-3">{String(i + 1).padStart(2, "0")}</span>
              <span><b className="block text-[14.5px]">{a}</b><span className="text-[13px] text-fg-2">{b}</span></span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

/** Время на вариант в режиме экзамена: 3 минуты на задание с кратким ответом и 20 — на развёрнутое */
function examMinutes(short: number, open: boolean) {
  return Math.max(10, short * 3 + (open ? 20 : 0));
}
const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Таймер экзамена: прилипает к верху, в последние 5 минут становится инверсным */
function ExamTimer({ timer, busy, onTimeUp }: { timer: NonNullable<Variant["timer"]>; busy: boolean; onTimeUp: () => void }) {
  const t = useT();
  const total = timer.minutes * 60_000;
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  const left = total - (now - timer.startedAt);
  useEffect(() => {
    if (left <= 0 && !fired.current && !busy) { fired.current = true; onTimeUp(); }
  }, [left, busy, onTimeUp]);
  const hot = left < 5 * 60_000;
  return (
    <div className="sticky top-[calc(env(safe-area-inset-top,0px)+57px)] z-20 -mx-4 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur-md lg:top-0 lg:mx-0 lg:rounded-b-xl lg:px-5">
      <div className="flex items-center gap-3">
        <span className={cn("rounded-md px-2 py-0.5 font-mono text-[12px] tracking-[.1em] uppercase", hot ? "bg-fg text-bg" : "border border-line-2 text-fg-3")}>{t("экзамен", "exam")}</span>
        <span className={cn("font-mono text-[22px] font-semibold tabular-nums", hot && "[animation:blink_1s_steps(2)_infinite]")}>{left > 0 ? mmss(left) : "00:00"}</span>
        <span className="flex-1" />
        <span className="text-[12.5px] text-fg-3">{left > 0 ? t(`из ${timer.minutes} мин`, `of ${timer.minutes} min`) : t("время вышло — проверяю", "time's up — marking")}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-sm bg-line">
        <i className={cn("block h-full", hot ? "bg-fg" : "bg-accent")} style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
      </div>
    </div>
  );
}

/** Итог режима экзамена: затраченное время и примерный перевод в стобалльную шкалу */
function ExamSummary({ timer, got, max }: { timer: NonNullable<Variant["timer"]>; got: number; max: number }) {
  const t = useT();
  const spent = (timer.finishedAt || Date.now()) - timer.startedAt;
  const test = max ? Math.round((got / max) * 100) : 0;
  return (
    <div className="grid basis-full grid-cols-2 gap-2.5 pt-2">
      <div className="rounded-xl border border-line px-4 py-3">
        <span className="block font-mono text-[11.5px] tracking-[.1em] text-fg-3 uppercase">{t("время", "time")}</span>
        <b className="font-mono text-[22px]">{mmss(Math.min(spent, timer.minutes * 60_000))}</b>
        <span className="text-[12.5px] text-fg-3"> / {timer.minutes}:00</span>
      </div>
      <div className="rounded-xl border border-line px-4 py-3">
        <span className="block font-mono text-[11.5px] tracking-[.1em] text-fg-3 uppercase">{t("тестовый балл", "test score")}</span>
        <b className="font-display text-[22px] font-black">≈ {test}</b><span className="text-[12.5px] text-fg-3"> / 100</span>
      </div>
      <p className="col-span-2 text-[12px] leading-snug text-fg-3">
        {t("Примерный перевод по доле набранных баллов. Официальная шкала ФИПИ нелинейная и считается для полного варианта, поэтому настоящий балл может отличаться.",
          "A rough conversion from the share of points scored. The official FIPI scale is non-linear and applies to a full paper, so your real score may differ.")}
      </p>
    </div>
  );
}

function Meta({ items }: { items: string[] }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2 font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
      <b className="font-bold text-fg">{items[0]}</b>
      {items.slice(1).map(x => <span key={x} className="flex items-center gap-2"><span className="h-px w-3.5 bg-line-2" />{x}</span>)}
    </div>
  );
}

function Solve({ v }: { v: Variant }) {
  const { patch, record, addWeak, touchStreak } = useApp();
  const askInChat = useUI(s => s.askInChat);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState(false);
  const scoreRef = useRef<HTMLDivElement>(null);
  const tr = useT();

  let got = 0, max = 0;
  v.tasks.forEach(t => { max += t.max; got += v.results[t.n]?.score || 0; });

  useEffect(() => { if (v.done) setTimeout(() => burst(scoreRef.current), 400); }, [v.done]);

  const setGiven = (n: number, val: string) => patch({ variant: { ...v, given: { ...v.given, [n]: val } } });

  const checking = useRef(false);
  const check = async () => {
    if (checking.current) return;
    checking.current = true;
    setBusy(true);
    const cur = useApp.getState().variant || v; // свежие ответы — проверка может запуститься по таймеру
    const results: Variant["results"] = {};
    for (const t of cur.tasks) {
      const given = (cur.given[t.n] || "").trim();
      if (t.type === "short") {
        const ok = isCorrect([t.answer, ...t.alt], given);
        results[t.n] = { score: ok ? t.max : 0 };
        record(v.subj, ok); if (!ok) addWeak(v.subj, t.topic);
        continue;
      }
      if (!given) { results[t.n] = { score: 0, feedback: L("Ответа нет.", "No answer.") }; addWeak(v.subj, t.topic); continue; }
      setStatus(L(`ИИ оценивает задание ${t.n} по критериям`, `The AI is marking task ${t.n} against the criteria`));
      try {
        const raw = await askAI([{ role: "user", content: isEn() ? `You are an examiner on the ${v.exam} (${examLabel(v.exam)}) subject committee. Mark the student's answer against the FIPI criteria, strictly but fairly.
Subject: ${subjName(v.subj)}
Task: ${t.q}
Model answer and criteria: ${t.answer}
Maximum score: ${t.max}
Student's answer: ${given}

Return ONLY JSON: {"score": integer from 0 to ${t.max}, "feedback": "2–4 sentences in English: what earned points and what was missing for full marks"}` : `Ты эксперт предметной комиссии ${v.exam}. Оцени ответ ученика по критериям ФИПИ, строго, но справедливо.
Предмет: ${subjNameRu(v.subj)}
Задание: ${t.q}
Эталон и критерии: ${t.answer}
Максимальный балл: ${t.max}
Ответ ученика: ${given}

Верни ТОЛЬКО JSON: {"score": целое от 0 до ${t.max}, "feedback": "2–4 предложения: что засчитано и чего не хватило до максимума"}` }], () => {});
        const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        const score = Math.min(t.max, Math.max(0, parseInt(j.score, 10) || 0));
        results[t.n] = { score, feedback: String(j.feedback || "") };
        if (score < t.max) addWeak(v.subj, t.topic);
      } catch (e) {
        results[t.n] = { score: 0, feedback: L("Не удалось получить оценку ИИ. ", "Couldn't get the AI's mark. ") + (e instanceof AIError ? aiErrorText(e) : L("Ответ пришёл не в том формате.", "The reply came in the wrong format.")) };
      }
    }
    touchStreak();
    const latest = useApp.getState().variant!;
    patch({ variant: { ...latest, results, done: true, ...(latest.timer ? { timer: { ...latest.timer, finishedAt: latest.timer.finishedAt || Date.now() } } : {}) } });
    setBusy(false); setStatus(""); checking.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pt-1 lg:max-w-[760px] lg:pt-4">
      {v.timer && !v.done && <ExamTimer timer={v.timer} busy={busy} onTimeUp={() => {
        const cur = useApp.getState().variant;
        if (cur?.timer && !cur.done) patch({ variant: { ...cur, timer: { ...cur.timer, finishedAt: Date.now() } } });
        check();
      }} />}
      {v.done ? (
        <div className="flex flex-wrap items-end gap-[18px] border-b border-line pt-[22px] pb-4">
          <div ref={scoreRef} className="font-display text-[clamp(64px,20vw,92px)] leading-[.82] font-black tracking-[-.05em]">
            <NumberTicker value={got} /><small className="text-[.38em] tracking-[-.02em] text-fg-3">/{max}</small>
          </div>
          <div className="min-w-[150px] flex-1 pb-1.5">
            <b>{subjName(v.subj)} · {examLabel(v.exam)}</b>
            <div className="text-[13px] text-fg-2">{tr("первичных баллов. Темы с ошибками — в «Прогрессе».", "primary points. Topics with mistakes are in Progress.")}</div>
          </div>
          <div className="h-1 basis-full overflow-hidden rounded-sm bg-line">
            <motion.i className="block h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${max ? (got / max) * 100 : 0}%` }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }} />
          </div>
          {v.timer && <ExamSummary timer={v.timer} got={got} max={max} />}
        </div>
      ) : (
        <div className="pt-5"><Meta items={[subjName(v.subj), `${v.tasks.length} ${pl(v.tasks.length, ["задание", "задания", "заданий"], ["task", "tasks"])}`, tr("ответы сохраняются", "answers are saved")]} /></div>
      )}

      {v.tasks.map((t, i) => (
        <motion.div key={t.n} className="border-b border-line py-5 last:border-0"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="min-w-[34px] font-display text-[22px] font-black tracking-[-.03em]">{String(t.n).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 font-mono text-[11.5px] tracking-[.08em] text-fg-3 uppercase">{t.topic}</span>
            {t.type === "open" && <span className="flex-none rounded-[5px] border border-accent px-[7px] py-[3px] font-mono text-[11.5px] tracking-[.06em] uppercase">{tr("часть 2", "part 2")} · {t.max} {tr("б.", "pts")}</span>}
          </div>
          <TaskText text={prettyMath(t.q)} className="mb-3.5 text-base leading-[1.55] break-words lg:text-[17px]" />
          {t.type === "open"
            ? <textarea className="field" rows={5} placeholder={tr("Развёрнутый ответ", "Extended answer")} disabled={v.done} value={v.given[t.n] || ""} onChange={e => setGiven(t.n, e.target.value)} />
            : <input className="cells" style={cellStyle((v.given[t.n] || "").length)} placeholder={tr("Ответ", "Answer")} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={v.done} value={v.given[t.n] || ""} onChange={e => setGiven(t.n, e.target.value)} />}
          {v.done && v.results[t.n] && <Result t={t} r={v.results[t.n]} onAsk={() =>
            askInChat(isEn()
              ? `Go through a task from my mock exam (${subjName(v.subj)}, ${examLabel(v.exam)}).\n\nTask: ${t.q}\n\nMy answer: ${v.given[t.n] || "(no answer)"}\nCorrect answer from the key: ${t.answer}\n\nWhy is this the right answer and where did I go wrong? If the key itself is wrong, say so.`
              : `Разбери задание из моего варианта (${subjName(v.subj)}, ${v.exam}).\n\nЗадание: ${t.q}\n\nМой ответ: ${v.given[t.n] || "(нет ответа)"}\nПравильный ответ по ключу: ${t.answer}\n\nПочему правильно именно так и где я ошибся? Если ключ сам неверный — скажи об этом.`)} />}
        </motion.div>
      ))}

      <div className="mt-1.5 flex gap-2">
        {!v.done && <Button className="flex-1" disabled={busy} onClick={check}>{busy ? tr("Проверяю…", "Marking…") : <>{tr("Проверить вариант", "Mark my paper")} <ArrowRight /></>}</Button>}
        <Button variant="outline" className={v.done ? "flex-1" : ""} onClick={e => {
          if (!v.done && !confirm) { setConfirm(true); shake(e.currentTarget); setTimeout(() => setConfirm(false), 3500); return; }
          patch({ variant: null });
        }}>{confirm ? tr("Точно бросить?", "Really give up?") : tr("Новый вариант", "New paper")}</Button>
      </div>
      {status && <p className="mt-3 font-mono text-xs text-fg-2">{status}</p>}
    </div>
  );
}

function Result({ t, r, onAsk }: { t: VTask; r: { score: number; feedback?: string }; onAsk: () => void }) {
  const [open, setOpen] = useState(false);
  const tr = useT();
  const kind = r.score >= t.max ? "ok" : r.score > 0 ? "part" : "bad";
  const title = t.type === "open"
    ? tr(`${r.score} из ${t.max} ${pl(t.max, ["балла", "баллов", "баллов"], ["", ""])}`, `${r.score} of ${t.max} points`)
    : r.score ? tr("Верно", "Correct") : tr("Неверно", "Wrong");
  return (
    <>
      <Verdict kind={kind} title={title}>{t.type === "open" ? prettyMath(r.feedback || "") : r.score ? undefined : `${tr("Правильный ответ", "Correct answer")}: ${t.answer}`}</Verdict>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-fg-2">
        {tr("Разбор", "Solution")} {open ? <Minus className="size-3.5 text-fg-3" /> : <Plus className="size-3.5 text-fg-3" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            {t.exp && <div className="mt-2.5 rounded-xl bg-bg-2 px-4 py-3.5 text-sm leading-relaxed text-fg-2">{prettyMath(t.exp)}</div>}
            <Button variant="secondary" size="sm" className="mt-2.5" onClick={onAsk}>{tr("Спросить ИИ", "Ask the AI")} <ArrowRight /></Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
