import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { TASKS, type Task } from "@/lib/tasks";
import { SUBJ_NAME, fipiBankUrl, sdamUrl } from "@/lib/data";
import { askAI, aiErrorText, useAiReady } from "@/lib/ai";
import { burst, shake } from "@/lib/fx";
import { cellStyle, isCorrect } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label, Typing, Verdict } from "@/components/ui/controls";

function pick(subjects: string[], answered: Record<string, boolean>, skip?: string): Task {
  const set = new Set(subjects);
  let pool = TASKS.filter(t => set.has(t.subj));
  if (!pool.length) pool = TASKS;
  const fresh = pool.filter(t => !(t.id in answered) && t.id !== skip);
  const wrong = pool.filter(t => answered[t.id] === false && t.id !== skip);
  const bag = fresh.length ? fresh : wrong.length ? wrong : pool.filter(t => t.id !== skip);
  return (bag.length ? bag : pool)[Math.floor(Math.random() * (bag.length || pool.length))];
}

export function TrainScreen() {
  const { subjects, answered, stats, exam, record } = useApp();
  const ready = useAiReady();
  const [task, setTask] = useState<Task>(() => pick(subjects, answered));
  const [given, setGiven] = useState("");
  const [checked, setChecked] = useState(false);
  const [explain, setExplain] = useState<{ text: string; busy: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const ok = checked && isCorrect(task.answers, given);
  const st = stats[task.subj] || { done: 0, correct: 0 };

  useEffect(() => {
    if (!checked) return;
    const v = verdictRef.current?.querySelector(".verdict");
    if (ok) burst(v?.querySelector("[data-vi]") || null); else shake(v || null);
  }, [checked, ok]);

  const check = () => {
    if (!given.trim()) { shake(inputRef.current); inputRef.current?.focus(); return; }
    record(task.subj, isCorrect(task.answers, given), task.id);
    setChecked(true);
  };
  const next = () => {
    setTask(pick(subjects, useApp.getState().answered, task.id));
    setGiven(""); setChecked(false); setExplain(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const askExplain = async () => {
    setExplain({ text: "", busy: true });
    try {
      await askAI([{ role: "user", content: `Предмет: ${SUBJ_NAME[task.subj]}. Тема: ${task.topic}.
Задание: ${task.q}
Правильный ответ: ${task.answers[0]}
Ответ ученика: ${given || "(пусто)"}

Объясни коротко, почему правильный ответ именно такой. Если ученик ошибся, назови вероятную причину ошибки и дай одно правило, которое поможет не ошибиться снова.` }],
        d => setExplain(e => ({ text: (e?.text || "") + d, busy: true })));
      setExplain(e => ({ text: e?.text || "", busy: false }));
    } catch (e) { setExplain({ text: aiErrorText(e), busy: false }); }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
        <div className="mt-5 mb-3.5 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[.08em] text-fg-3 uppercase">
          <b className="font-bold text-fg">{SUBJ_NAME[task.subj]}</b>
          <span className="h-px w-3.5 bg-line-2" />
          <span>{task.topic}</span>
          <span className="flex-1" />
          <span>{st.correct}/{st.done}</span>
        </div>
        <p className="mb-5 text-[19px] leading-[1.45] font-medium tracking-[-.005em] text-pretty">{task.q}</p>

        <label className="mb-3 block">
          <Label>Ответ</Label>
          <input ref={inputRef} className="cells" style={cellStyle(given.length)} value={given} disabled={checked} autoComplete="off" autoCapitalize="off" spellCheck={false}
            placeholder="Введите ответ" onChange={e => setGiven(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !checked) check(); }} />
        </label>

        {!checked ? (
          <Button className="w-full" onClick={check}>Проверить</Button>
        ) : (
          <div ref={verdictRef}>
            <Verdict kind={ok ? "ok" : "bad"} title={ok ? "Верно" : "Неверно"}>{ok ? "Ответ засчитан." : `Правильный ответ: ${task.answers[0]}`}</Verdict>
            <div className="mt-2.5 rounded-xl bg-bg-2 px-4 py-3.5 text-sm leading-relaxed text-fg-2">
              <Label className="mb-1.5">Разбор</Label>{task.exp}
            </div>
            <div className="mt-3.5 flex gap-2">
              <Button className="flex-1" onClick={next}>Следующее <ArrowRight /></Button>
              <Button variant="outline" disabled={!ready || !!explain?.busy} onClick={askExplain}>Объяснить</Button>
            </div>
            {explain && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-bg-2 px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap text-fg-2">
                <Label className="mb-1.5">Объяснение ИИ</Label>
                {explain.text || <Typing />}
              </motion.div>
            )}
          </div>
        )}

        <p className="mt-6 text-[13px] text-fg-3">
          Больше заданий по теме «{task.topic}» — на <a className="link-u text-fg" href={sdamUrl(task.subj, exam)} target="_blank" rel="noopener">Сдам ГИА</a> и
          в <a className="link-u text-fg" href={fipiBankUrl(exam)} target="_blank" rel="noopener">банке ФИПИ</a>.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
