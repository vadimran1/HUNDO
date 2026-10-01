import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useApp, useUI } from "@/lib/store";
import { useAiReady } from "@/lib/ai";
import { useT, pl, examLabel } from "@/lib/i18n";
import { subjName } from "@/lib/data";
import { daysLeft, formatDate } from "@/lib/utils";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BorderBeam } from "@/components/magicui/border-beam";
import { BlurFade } from "@/components/magicui/blur-fade";
import { weakTopics } from "./Stats";

export function HomeScreen() {
  const exam = useApp(s => s.exam);
  const examDate = useApp(s => s.examDate);
  const stats = useApp(s => s.stats);
  const streak = useApp(s => s.streak);
  const subjects = useApp(s => s.subjects);
  const state = useApp();
  const { go, openSheet } = useUI();
  const ready = useAiReady();
  const t = useT();

  const d = daysLeft(examDate);
  let done = 0, correct = 0;
  for (const k in stats) { done += stats[k].done; correct += stats[k].correct; }
  const pct = done ? Math.round((correct / done) * 100) : 0;
  const weak = weakTopics(state).length;

  const TICKS = 40, span = 260;
  const passed = d === null ? 0 : Math.round(TICKS * Math.min(1, Math.max(0, 1 - d / span)));
  const streakTxt = `${streak.days} ${pl(streak.days, ["день", "дня", "дней"], ["day", "days"])} ${t("подряд", "in a row")}`;

  return (
    <div className="pb-4 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-14 lg:pt-6">
      <div>
        <BlurFade className="grid grid-cols-[auto_1fr] items-end gap-x-[18px] gap-y-1 pt-7">
          <div className="row-span-2 font-display text-[clamp(64px,22vw,104px)] leading-[.82] font-black tracking-[-.05em] lg:text-[148px]">
            {d === null ? "—" : <NumberTicker value={d} />}
          </div>
          <div className="text-[15px] leading-tight font-semibold lg:text-[18px]">
            {d === null ? t("укажите дату", "set a date") : pl(d, ["день", "дня", "дней"], ["day", "days"])}<br />{t("до", "until")} {examLabel(exam)}
          </div>
          <div className="font-mono text-xs text-fg-3">{formatDate(examDate)}</div>
        </BlurFade>

        <div className="mt-[18px] flex h-4 items-end gap-[3px] lg:mt-7" aria-hidden>
          {Array.from({ length: TICKS }, (_, i) => (
            <motion.i key={i}
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.2 + i * 0.012, duration: 0.3 }}
              className={i === passed ? "h-4 flex-1 origin-bottom bg-fg" : i < passed ? "h-1.5 flex-1 origin-bottom bg-accent" : "h-1.5 flex-1 origin-bottom bg-line-2"} />
          ))}
        </div>
        <p className="mt-3 text-[13px] text-fg-3">
          {done
            ? t(`Решено ${done} · верно ${pct}% · ${streakTxt}`, `${done} solved · ${pct}% correct · ${streakTxt}`)
            : t("Решите первое задание — здесь появится статистика", "Solve your first task and your stats will show up here")}
        </p>

        {/* на компьютере — предметы и короткая сводка под счётчиком */}
        <div className="mt-10 hidden lg:block">
          <p className="mb-3 font-mono text-[12px] tracking-[.12em] text-fg-3 uppercase">{t("Ваши предметы", "Your subjects")}</p>
          <div className="flex flex-wrap gap-2">
            {subjects.map(id => {
              const s = stats[id];
              return (
                <span key={id} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold">
                  {subjName(id)}
                  {s?.done ? <span className="font-mono text-[11.5px] text-fg-3">{Math.round((s.correct / s.done) * 100)}%</span> : null}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lg:pt-7">
        <div className="mt-7 grid gap-2 lg:mt-0 lg:gap-3">
          <motion.button whileTap={{ scale: 0.985 }} whileHover={{ y: -2 }} onClick={() => go("variant")}
            className="relative flex w-full items-center gap-3.5 overflow-hidden rounded-[14px] bg-accent px-4 py-[18px] text-left text-on-accent lg:px-6 lg:py-7">
            <span className="min-w-0 flex-1">
              <b className="block text-[16px] lg:text-[20px]">{t("Вариант от ИИ", "AI mock exam")}</b>
              <span className="text-[12.5px] opacity-75 lg:text-[14px]">{t("нейросеть составит, проверит и разберёт", "the AI writes it, marks it and explains mistakes")}</span>
            </span>
            <ArrowRight className="size-[18px]" />
            <BorderBeam size={70} duration={7} colorFrom="var(--on-accent)" colorTo="transparent" borderWidth={1.5} />
          </motion.button>
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            {([
              [t("Тренажёр", "Practice"), t("задания с разбором", "tasks with solutions"), () => go("train")],
              [t("Разобрать задание", "Explain a task"), t("вставьте условие", "paste any task"), () => openSheet("paste")],
              [t("План", "Study plan"), t("по неделям до экзамена", "week by week"), () => openSheet("plan")],
              [t("Источники", "Sources"), t("ФИПИ и Сдам ГИА", "FIPI & Sdam GIA"), () => openSheet("sources")],
            ] as const).map(([label, sub, fn]) => (
              <motion.button key={label} whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }} onClick={fn}
                className="rounded-[14px] border border-line px-3.5 py-[15px] text-left text-[14px] leading-tight font-bold transition-colors hover:border-fg lg:px-5 lg:py-5 lg:text-[15.5px]">
                {label}
                <span className="mt-1 hidden text-[12.5px] font-normal text-fg-3 lg:block">{sub}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {weak > 0 && <LinkRow onClick={() => go("stats")}>{weak} {pl(weak, ["тема", "темы", "тем"], ["topic", "topics"])} {t("на повторение", "to review")}</LinkRow>}
        {!ready && <LinkRow onClick={() => openSheet("settings")}>{t("ИИ не подключён — открыть настройки", "AI is not connected — open Settings")}</LinkRow>}
      </div>

      <DeskDashboard />
    </div>
  );
}

/** Нижний ряд карточек — только на широком экране */
function DeskDashboard() {
  const state = useApp();
  const { variant, stats, subjects } = state;
  const go = useUI(s => s.go);
  const t = useT();
  const weak = weakTopics(state).slice(0, 4);
  let got = 0, max = 0;
  variant?.tasks.forEach(x => { max += x.max; got += variant.results[x.n]?.score || 0; });
  const card = "rounded-[16px] border border-line p-5 text-left";
  const head = "mb-4 font-mono text-[11.5px] tracking-[.12em] text-fg-3 uppercase";

  return (
    <div className="col-span-2 mt-12 hidden grid-cols-3 gap-4 lg:grid">
      <motion.button whileHover={{ y: -2 }} onClick={() => go("variant")} className={card + " transition-colors hover:border-fg"}>
        <p className={head}>{t("Последний вариант", "Last mock exam")}</p>
        {variant ? (
          <>
            <div className="font-display text-[52px] leading-[.85] font-black tracking-[-.04em]">
              {variant.done ? got : "…"}<small className="text-[.4em] text-fg-3">/{max}</small>
            </div>
            <p className="mt-2 text-[13px] text-fg-2">{subjName(variant.subj)} · {examLabel(variant.exam)} · {variant.done ? t("проверен", "marked") : t("в процессе", "in progress")}</p>
            <div className="mt-4 h-1 overflow-hidden rounded-sm bg-line">
              <motion.i className="block h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${max && variant.done ? (got / max) * 100 : 0}%` }} transition={{ duration: 1, delay: 0.3 }} />
            </div>
          </>
        ) : (
          <p className="text-[14px] text-fg-2">{t("Ещё не было. Составьте первый — ИИ проверит и разберёт ошибки.", "None yet. Create your first one — the AI marks it and explains mistakes.")}</p>
        )}
      </motion.button>

      <div className={card}>
        <p className={head}>{t("На повторение", "To review")}</p>
        {weak.length ? (
          <ul className="grid gap-2.5">
            {weak.map(w => (
              <li key={w.subj + w.topic} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="truncate font-medium">{w.topic}</span>
                <span className="flex-none font-mono text-[11px] text-fg-3">{subjName(w.subj)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[14px] text-fg-2">{t("Ошибок пока нет.", "No mistakes yet.")}</p>}
      </div>

      <div className={card}>
        <p className={head}>{t("Точность", "Accuracy")}</p>
        <div className="grid gap-3">
          {subjects.slice(0, 4).map((id, i) => {
            const s = stats[id] || { done: 0, correct: 0 };
            const pct = s.done ? Math.round((s.correct / s.done) * 100) : 0;
            return (
              <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 text-[13px]">
                <span className="truncate font-medium">{subjName(id)}</span>
                <span className="font-mono text-[12px] text-fg-3">{s.done ? pct + "%" : "—"}</span>
                <span className="col-span-2 h-1 overflow-hidden rounded-sm bg-bg-3">
                  <motion.i className="block h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.2 + i * 0.07 }} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
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
