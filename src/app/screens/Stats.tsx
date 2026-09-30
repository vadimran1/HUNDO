import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useApp, useUI } from "@/lib/store";
import { SUBJ_NAME } from "@/lib/data";
import { TASKS, type SubjectId } from "@/lib/tasks";
import { plural, cn } from "@/lib/utils";
import { shake } from "@/lib/fx";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/controls";
import { NumberTicker } from "@/components/magicui/number-ticker";

export function weakTopics(s: { answered: Record<string, boolean>; weakAI: { subj: SubjectId; topic: string }[] }) {
  const out: { subj: SubjectId; topic: string }[] = [];
  for (const id in s.answered) {
    if (s.answered[id] === false) { const t = TASKS.find(x => x.id === id); if (t) out.push({ subj: t.subj, topic: t.topic }); }
  }
  for (const w of s.weakAI) if (!out.some(o => o.subj === w.subj && o.topic === w.topic)) out.push(w);
  return out.filter((o, i) => out.findIndex(x => x.subj === o.subj && x.topic === o.topic) === i);
}

export function StatsScreen() {
  const state = useApp();
  const { stats, subjects, streak, exam, resetStats } = state;
  const askInChat = useUI(s => s.askInChat);
  const [confirm, setConfirm] = useState(false);
  let done = 0, correct = 0;
  for (const k in stats) { done += stats[k].done; correct += stats[k].correct; }
  const weak = weakTopics(state);

  return (
    <div className="pt-5">
      <div className="mb-3.5 flex flex-wrap items-center gap-2 font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
        <b className="font-bold text-fg">Прогресс</b><span className="h-px w-3.5 bg-line-2" />
        <span>{exam} · {streak.days} {plural(streak.days, "день", "дня", "дней")} подряд</span>
      </div>
      <div className="flex flex-wrap items-end gap-7">
        <div><div className="font-display text-[56px] leading-[.9] font-black tracking-[-.04em]"><NumberTicker value={done} /></div><span className="text-[13px] text-fg-3">решено заданий</span></div>
        <div><div className="font-display text-[56px] leading-[.9] font-black tracking-[-.04em]">{done ? <><NumberTicker value={Math.round((correct / done) * 100)} />%</> : "—"}</div><span className="text-[13px] text-fg-3">точность</span></div>
      </div>

      <Section>По предметам</Section>
      {subjects.map((id, i) => {
        const s = stats[id] || { done: 0, correct: 0 };
        const pct = s.done ? Math.round((s.correct / s.done) * 100) : 0;
        return (
          <div key={id} className="flex items-center gap-3 border-t border-line py-3 first-of-type:border-0">
            <span className="min-w-0 flex-1 text-[14.5px] font-medium">{SUBJ_NAME[id]}<small className="block text-xs font-normal text-fg-3">{s.correct} из {s.done}</small></span>
            <span className="h-1.5 w-[110px] flex-none overflow-hidden rounded-[3px] bg-bg-3">
              <motion.i className={cn("block h-full rounded-[3px]", s.done && pct < 50 ? "bg-[repeating-linear-gradient(-45deg,var(--fg)_0_3px,transparent_3px_6px)]" : "bg-accent")}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.06, ease: [0.2, 0.8, 0.2, 1] }} />
            </span>
            <span className="min-w-[42px] text-right font-mono text-[13px] text-fg-2">{s.done ? pct + "%" : "—"}</span>
          </div>
        );
      })}

      <Section>На повторение</Section>
      {weak.length ? weak.map(w => (
        <div key={w.subj + w.topic} className="flex items-center gap-3 border-t border-line py-3 first-of-type:border-0">
          <span className="min-w-0 flex-1 text-[14.5px] font-medium">{w.topic}<small className="block text-xs font-normal text-fg-3">{SUBJ_NAME[w.subj]}</small></span>
          <Button variant="secondary" size="sm" onClick={() => askInChat(`Я ошибаюсь в теме «${w.topic}» (${SUBJ_NAME[w.subj]}, ${exam}). Объясни эту тему коротко и понятно, назови типичные ловушки в заданиях и дай 3 тренировочных вопроса с ответами в конце.`)}>
            Разобрать <ArrowRight />
          </Button>
        </div>
      )) : <p className="text-[13px] text-fg-2">Ошибок пока нет. Решите несколько заданий — сюда попадут темы, где вы сбились.</p>}

      <Section>Сброс</Section>
      <Button variant="outline" onClick={e => {
        if (confirm) { resetStats(); setConfirm(false); return; }
        setConfirm(true); shake(e.currentTarget); setTimeout(() => setConfirm(false), 3500);
      }}>{confirm ? "Точно сбросить? Нажмите ещё раз" : "Сбросить статистику"}</Button>
    </div>
  );
}
