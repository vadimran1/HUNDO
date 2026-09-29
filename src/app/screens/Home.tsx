import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useApp, useUI } from "@/lib/store";
import { useAiReady } from "@/lib/ai";
import { daysLeft, formatDate, plural } from "@/lib/utils";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BorderBeam } from "@/components/magicui/border-beam";
import { BlurFade } from "@/components/magicui/blur-fade";
import { weakTopics } from "./Stats";

export function HomeScreen() {
  const exam = useApp(s => s.exam);
  const examDate = useApp(s => s.examDate);
  const stats = useApp(s => s.stats);
  const streak = useApp(s => s.streak);
  const state = useApp();
  const { go, openSheet } = useUI();
  const ready = useAiReady();

  const d = daysLeft(examDate);
  let done = 0, correct = 0;
  for (const k in stats) { done += stats[k].done; correct += stats[k].correct; }
  const pct = done ? Math.round((correct / done) * 100) : 0;
  const weak = weakTopics(state).length;

  const TICKS = 40, span = 260;
  const passed = d === null ? 0 : Math.round(TICKS * Math.min(1, Math.max(0, 1 - d / span)));

  return (
    <div className="pb-4">
      <BlurFade className="grid grid-cols-[auto_1fr] items-end gap-x-[18px] gap-y-1 pt-7">
        <div className="row-span-2 font-display text-[clamp(64px,22vw,104px)] leading-[.82] font-black tracking-[-.05em]">
          {d === null ? "—" : <NumberTicker value={d} />}
        </div>
        <div className="text-[15px] leading-tight font-semibold">{d === null ? "укажите дату" : plural(d, "день", "дня", "дней")}<br />до {exam}</div>
        <div className="font-mono text-xs text-fg-3">{formatDate(examDate)}</div>
      </BlurFade>

      <div className="mt-[18px] flex h-4 items-end gap-[3px]" aria-hidden>
        {Array.from({ length: TICKS }, (_, i) => (
          <motion.i key={i}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.2 + i * 0.012, duration: 0.3 }}
            className={i === passed ? "h-4 flex-1 origin-bottom bg-fg" : i < passed ? "h-1.5 flex-1 origin-bottom bg-accent" : "h-1.5 flex-1 origin-bottom bg-line-2"} />
        ))}
      </div>
      <p className="mt-3 text-[13px] text-fg-3">
        {done ? `Решено ${done} · верно ${pct}% · ${streak.days} ${plural(streak.days, "день", "дня", "дней")} подряд` : "Решите первое задание — здесь появится статистика"}
      </p>

      <div className="mt-7 grid gap-2">
        <motion.button whileTap={{ scale: 0.985 }} onClick={() => go("variant")}
          className="relative flex w-full items-center gap-3.5 overflow-hidden rounded-[14px] bg-accent px-4 py-[18px] text-left text-on-accent">
          <span className="min-w-0 flex-1">
            <b className="block text-[16px]">Вариант от ИИ</b>
            <span className="text-[12.5px] opacity-75">нейросеть составит, проверит и разберёт</span>
          </span>
          <ArrowRight className="size-[18px]" />
          <BorderBeam size={70} duration={7} colorFrom="var(--on-accent)" colorTo="transparent" borderWidth={1.5} />
        </motion.button>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["Тренажёр", () => go("train")],
            ["Разобрать задание", () => openSheet("paste")],
            ["План", () => openSheet("plan")],
            ["Источники", () => openSheet("sources")],
          ] as const).map(([label, fn]) => (
            <motion.button key={label} whileTap={{ scale: 0.97 }} onClick={fn}
              className="rounded-[14px] border border-line px-3.5 py-[15px] text-left text-[14px] leading-tight font-bold transition-colors hover:border-fg">
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      {weak > 0 && <LinkRow onClick={() => go("stats")}>{weak} {plural(weak, "тема", "темы", "тем")} на повторение</LinkRow>}
      {!ready && <LinkRow onClick={() => openSheet("settings")}>ИИ не подключён — открыть настройки</LinkRow>}
    </div>
  );
}

function LinkRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group mt-2.5 flex w-full items-center justify-between gap-2.5 border-t border-line px-0.5 py-3.5 text-left text-sm font-medium text-fg-2 hover:text-fg">
      {children}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </button>
  );
}
