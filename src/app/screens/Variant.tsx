import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus, Minus } from "lucide-react";
import { useApp, useUI, type VTask, type Variant } from "@/lib/store";
import { SUBJ_NAME, fipiBankUrl, sdamUrl } from "@/lib/data";
import { askAI, aiErrorText, AIError, useAiReady } from "@/lib/ai";
import { burst, shake } from "@/lib/fx";
import { cellStyle, examYear, isCorrect, plural } from "@/lib/utils";
import type { SubjectId } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Chip, Label, Segmented, Switch, Verdict } from "@/components/ui/controls";
import { NumberTicker } from "@/components/magicui/number-ticker";

function variantPrompt(exam: string, subj: string, count: number, withOpen: boolean) {
  return `Составь тренировочный вариант ${exam}-${examYear()} по предмету «${SUBJ_NAME[subj]}».
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
  if (a < 0 || b <= a) throw new Error("ИИ вернул ответ не в том формате. Попробуйте ещё раз.");
  let arr: unknown;
  try { arr = JSON.parse(t.slice(a, b + 1)); } catch { throw new Error("ИИ прислал вариант с ошибкой в разметке. Нажмите «Составить вариант» ещё раз."); }
  const tasks = (Array.isArray(arr) ? arr : []).filter((x: any) => x && x.q && x.answer).map((x: any, i: number): VTask => ({
    n: i + 1, type: x.type === "open" ? "open" : "short", topic: String(x.topic || "Задание"), q: String(x.q),
    answer: String(x.answer), alt: Array.isArray(x.alt) ? x.alt.map(String) : [],
    max: Math.max(1, parseInt(x.max, 10) || 1), exp: String(x.exp || ""),
  }));
  if (!tasks.length) throw new Error("В ответе ИИ не нашлось заданий. Попробуйте ещё раз.");
  return tasks;
}

export function VariantScreen() {
  const variant = useApp(s => s.variant);
  return variant ? <Solve v={variant} /> : <Setup />;
}

function Setup() {
  const { subjects, exam, patch } = useApp();
  const ready = useAiReady();
  const [subj, setSubj] = useState<SubjectId>(subjects[0] || "hist");
  const [count, setCount] = useState<"5" | "10" | "15">("10");
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const errRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    setBusy(true); setErr(""); setLog(["подключаюсь к нейросети"]);
    let acc = "", lastN = 0;
    try {
      const text = await askAI([{ role: "user", content: variantPrompt(exam, subj, +count, open) }], d => {
        if (!acc) setLog(l => [...l, "нейросеть пишет задания"]);
        acc += d;
        const n = (acc.match(/"q"\s*:/g) || []).length;
        if (n > lastN) { lastN = n; setLog(l => [...l, `> задание ${String(n).padStart(2, "0")} готово`]); }
      });
      setLog(l => [...l, "проверяю формат"]);
      const tasks = parseVariant(text);
      patch({ variant: { subj, exam, created: Date.now(), tasks, given: {}, results: {}, done: false } });
    } catch (e) {
      setBusy(false);
      setErr(e instanceof AIError ? aiErrorText(e) : (e as Error).message);
      setTimeout(() => shake(errRef.current), 50);
    }
  };

  if (busy) return (
    <div className="pt-5">
      <Meta items={[SUBJ_NAME[subj], `${count} заданий`]} />
      <h2 className="font-display text-[28px] font-bold tracking-[-.02em]">Собираю вариант</h2>
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
    <div className="pt-5">
      <Meta items={["Вариант от ИИ", `${exam} ${examYear()}`]} />
      <h2 className="font-display text-[clamp(22px,6.4vw,28px)] leading-[1.15] font-bold tracking-[-.02em]">Нейросеть составит вариант, проверит и разберёт ошибки</h2>

      <div className="mt-6"><Label>Предмет</Label>
        <div className="flex flex-wrap gap-2">{subjects.map(id => <Chip key={id} pressed={id === subj} onClick={() => setSubj(id)}>{SUBJ_NAME[id]}</Chip>)}</div>
      </div>
      <div className="mt-5"><Label>Сколько заданий</Label>
        <Segmented id="vcount" value={count} onChange={v => setCount(v)} items={[["5", "5"], ["10", "10"], ["15", "15"]]} />
      </div>
      <div className="mt-5"><Switch checked={open} onChange={setOpen}>Задание с развёрнутым ответом — ИИ оценит его по критериям</Switch></div>

      <Button className="mt-6 w-full" disabled={!ready} onClick={generate}>{ready ? <>Составить вариант <ArrowRight /></> : "ИИ не подключён — см. настройки"}</Button>
      {err && <div ref={errRef} className="hatch mt-3 rounded-xl border border-line-2 px-4 py-3 text-[13.5px]">{err}</div>}
      <p className="mt-3.5 text-xs leading-normal text-fg-3">
        Задания составляет нейросеть, в них бывают неточности. Официальные задания — в <a className="link-u text-fg" href={fipiBankUrl(exam)} target="_blank" rel="noopener">банке ФИПИ</a> и
        на <a className="link-u text-fg" href={sdamUrl(subj, exam)} target="_blank" rel="noopener">Сдам ГИА</a>.
      </p>
    </div>
  );
}

function Meta({ items }: { items: string[] }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[.08em] text-fg-3 uppercase">
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

  let got = 0, max = 0;
  v.tasks.forEach(t => { max += t.max; got += v.results[t.n]?.score || 0; });

  useEffect(() => { if (v.done) setTimeout(() => burst(scoreRef.current), 400); }, [v.done]);

  const setGiven = (n: number, val: string) => patch({ variant: { ...v, given: { ...v.given, [n]: val } } });

  const check = async () => {
    setBusy(true);
    const results: Variant["results"] = {};
    for (const t of v.tasks) {
      const given = (v.given[t.n] || "").trim();
      if (t.type === "short") {
        const ok = isCorrect([t.answer, ...t.alt], given);
        results[t.n] = { score: ok ? t.max : 0 };
        record(v.subj, ok); if (!ok) addWeak(v.subj, t.topic);
        continue;
      }
      if (!given) { results[t.n] = { score: 0, feedback: "Ответа нет." }; addWeak(v.subj, t.topic); continue; }
      setStatus(`ИИ оценивает задание ${t.n} по критериям`);
      try {
        const raw = await askAI([{ role: "user", content: `Ты эксперт предметной комиссии ${v.exam}. Оцени ответ ученика по критериям ФИПИ, строго, но справедливо.
Предмет: ${SUBJ_NAME[v.subj]}
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
        results[t.n] = { score: 0, feedback: "Не удалось получить оценку ИИ. " + (e instanceof AIError ? aiErrorText(e) : "Ответ пришёл не в том формате.") };
      }
    }
    touchStreak();
    patch({ variant: { ...useApp.getState().variant!, results, done: true } });
    setBusy(false); setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pt-1">
      {v.done ? (
        <div className="flex flex-wrap items-end gap-[18px] border-b border-line pt-[22px] pb-4">
          <div ref={scoreRef} className="font-display text-[clamp(64px,20vw,92px)] leading-[.82] font-black tracking-[-.05em]">
            <NumberTicker value={got} /><small className="text-[.38em] tracking-[-.02em] text-fg-3">/{max}</small>
          </div>
          <div className="min-w-[150px] flex-1 pb-1.5">
            <b>{SUBJ_NAME[v.subj]} · {v.exam}</b>
            <div className="text-[13px] text-fg-2">первичных баллов. Темы с ошибками — в «Прогрессе».</div>
          </div>
          <div className="h-1 basis-full overflow-hidden rounded-sm bg-line">
            <motion.i className="block h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${max ? (got / max) * 100 : 0}%` }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }} />
          </div>
        </div>
      ) : (
        <div className="pt-5"><Meta items={[SUBJ_NAME[v.subj], `${v.tasks.length} ${plural(v.tasks.length, "задание", "задания", "заданий")}`, "ответы сохраняются"]} /></div>
      )}

      {v.tasks.map((t, i) => (
        <motion.div key={t.n} className="border-b border-line py-5 last:border-0"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="min-w-[34px] font-display text-[22px] font-black tracking-[-.03em]">{String(t.n).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 font-mono text-[10.5px] tracking-[.08em] text-fg-3 uppercase">{t.topic}</span>
            {t.type === "open" && <span className="flex-none rounded-[5px] border border-accent px-[7px] py-[3px] font-mono text-[10.5px] tracking-[.06em] uppercase">часть 2 · {t.max} б.</span>}
          </div>
          <p className="mb-3.5 text-base leading-[1.55] break-words whitespace-pre-wrap">{t.q}</p>
          {t.type === "open"
            ? <textarea className="field" rows={5} placeholder="Развёрнутый ответ" disabled={v.done} value={v.given[t.n] || ""} onChange={e => setGiven(t.n, e.target.value)} />
            : <input className="cells" style={cellStyle((v.given[t.n] || "").length)} placeholder="Ответ" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={v.done} value={v.given[t.n] || ""} onChange={e => setGiven(t.n, e.target.value)} />}
          {v.done && v.results[t.n] && <Result t={t} r={v.results[t.n]} onAsk={() =>
            askInChat(`Разбери задание из моего варианта (${SUBJ_NAME[v.subj]}, ${v.exam}).\n\nЗадание: ${t.q}\n\nМой ответ: ${v.given[t.n] || "(нет ответа)"}\nПравильный ответ по ключу: ${t.answer}\n\nПочему правильно именно так и где я ошибся? Если ключ сам неверный — скажи об этом.`)} />}
        </motion.div>
      ))}

      <div className="mt-1.5 flex gap-2">
        {!v.done && <Button className="flex-1" disabled={busy} onClick={check}>{busy ? "Проверяю…" : <>Проверить вариант <ArrowRight /></>}</Button>}
        <Button variant="outline" className={v.done ? "flex-1" : ""} onClick={e => {
          if (!v.done && !confirm) { setConfirm(true); shake(e.currentTarget); setTimeout(() => setConfirm(false), 3500); return; }
          patch({ variant: null });
        }}>{confirm ? "Точно бросить?" : "Новый вариант"}</Button>
      </div>
      {status && <p className="mt-3 font-mono text-xs text-fg-2">{status}</p>}
    </div>
  );
}

function Result({ t, r, onAsk }: { t: VTask; r: { score: number; feedback?: string }; onAsk: () => void }) {
  const [open, setOpen] = useState(false);
  const kind = r.score >= t.max ? "ok" : r.score > 0 ? "part" : "bad";
  const title = t.type === "open" ? `${r.score} из ${t.max} ${plural(t.max, "балла", "баллов", "баллов")}` : r.score ? "Верно" : "Неверно";
  return (
    <>
      <Verdict kind={kind} title={title}>{t.type === "open" ? r.feedback : r.score ? undefined : `Правильный ответ: ${t.answer}`}</Verdict>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-fg-2">
        Разбор {open ? <Minus className="size-3.5 text-fg-3" /> : <Plus className="size-3.5 text-fg-3" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            {t.exp && <div className="mt-2.5 rounded-xl bg-bg-2 px-4 py-3.5 text-sm leading-relaxed text-fg-2">{t.exp}</div>}
            <Button variant="secondary" size="sm" className="mt-2.5" onClick={onAsk}>Спросить ИИ <ArrowRight /></Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
