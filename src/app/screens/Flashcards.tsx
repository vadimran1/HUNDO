import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useApp, type CardState } from "@/lib/store";
import { CARDS, type Card } from "@/lib/cards";
import { subjName } from "@/lib/data";
import { useT, pl } from "@/lib/i18n";
import type { SubjectId } from "@/lib/tasks";
import { burst } from "@/lib/fx";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

/*
 * Карточки с интервальным повторением (система Лейтнера).
 * Пять коробок: «помню» — карточка переезжает в следующую и показывается реже
 * (через 1, 2, 4, 8, 16 дней); «не помню» — возвращается в первую и ещё раз
 * появляется в этой же тренировке. Так слабые карточки идут чаще.
 */
const INTERVALS = [0, 1, 2, 4, 8, 16];
const NEW_PER_SESSION = 10;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

function buildQueue(pool: Card[], st: Record<string, CardState>, all = false) {
  if (all) return [...pool].sort(() => Math.random() - 0.5).map(c => c.id);
  const d = today();
  const due = pool.filter(c => st[c.id] && st[c.id].due <= d).sort((a, b) => st[a.id].box - st[b.id].box);
  const fresh = pool.filter(c => !st[c.id]).slice(0, NEW_PER_SESSION);
  return [...due, ...fresh].map(c => c.id);
}

export function Flashcards() {
  const subjects = useApp(s => s.subjects);
  const cards = useApp(s => s.cards);
  const patch = useApp(s => s.patch);
  const touchStreak = useApp(s => s.touchStreak);
  const t = useT();
  const [filter, setFilter] = useState<SubjectId | "all">("all");
  const pool = useMemo(() => CARDS.filter(c => (filter === "all" ? subjects.includes(c.subj) : c.subj === filter)), [filter, subjects]);
  const [queue, setQueue] = useState<string[]>(() => buildQueue(pool, cards));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState({ ok: 0, again: 0 });

  // смена фильтра — новая тренировка
  useEffect(() => { setQueue(buildQueue(pool, useApp.getState().cards)); setI(0); setFlipped(false); setSession({ ok: 0, again: 0 }); }, [pool]);

  const d = today();
  const dueCount = pool.filter(c => cards[c.id] && cards[c.id].due <= d).length;
  const newCount = pool.filter(c => !cards[c.id]).length;
  const learned = pool.filter(c => (cards[c.id]?.box || 0) >= 4).length;
  const card = CARDS.find(c => c.id === queue[i]);

  const grade = (ok: boolean) => {
    if (!card) return;
    const st = useApp.getState().cards[card.id];
    const box = ok ? Math.min(5, (st?.box || 0) + 1) : 1;
    patch({ cards: { ...useApp.getState().cards, [card.id]: { box, due: ok ? addDays(INTERVALS[box]) : today() } } });
    touchStreak();
    setSession(s => ({ ok: s.ok + (ok ? 1 : 0), again: s.again + (ok ? 0 : 1) }));
    if (!ok) {
      // «не помню» — карточка вернётся через пару карточек
      setQueue(q => { const n = [...q]; n.splice(Math.min(n.length, i + 3), 0, card.id); return n; });
    }
    setFlipped(false);
    setI(x => x + 1);
  };

  // клавиатура на компьютере: пробел — перевернуть, 1/← — не помню, 2/→ — помню
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
      else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) { e.preventDefault(); grade(false); }
      else if (flipped && (e.key === "2" || e.key === "ArrowRight")) { e.preventDefault(); grade(true); }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  });

  const nextDue = pool.map(c => cards[c.id]?.due).filter((x): x is string => !!x && x > d).sort()[0];
  const daysTo = nextDue ? Math.round((+new Date(nextDue) - +new Date(d)) / 864e5) : 0;

  return (
    <div className="pb-4">
      <div className="mt-5 flex flex-wrap gap-2">
        <Chip pressed={filter === "all"} onClick={() => setFilter("all")}>{t("Все мои", "All mine")}</Chip>
        {subjects.map(id => <Chip key={id} pressed={filter === id} onClick={() => setFilter(id)}>{subjName(id)}</Chip>)}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[[dueCount, t("повторить", "to review")], [newCount, t("новых", "new")], [learned, t("выучено", "learned")]].map(([n, l]) => (
          <div key={l as string} className="rounded-xl border border-line px-3 py-2.5">
            <b className="block font-display text-[22px] leading-none font-black">{n}</b>
            <span className="text-[12px] text-fg-3">{l}</span>
          </div>
        ))}
      </div>

      {card ? (
        <>
          <div className="mt-5 mb-2 flex items-center justify-between font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
            <span>{subjName(card.subj)}</span>
            <span>{Math.min(i + 1, queue.length)} / {queue.length}</span>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <FlipCard key={queue[i] + ":" + i} card={card} en={t.en} flipped={flipped} box={cards[card.id]?.box || 0}
              onFlip={() => setFlipped(f => !f)} onSwipe={ok => grade(ok)} />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {flipped ? (
              <motion.div key="grade" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={() => grade(false)}>{t("Не помню", "Forgot")} <kbd className="hidden font-mono text-[11px] opacity-50 lg:inline">1</kbd></Button>
                <Button size="lg" onClick={() => grade(true)}>{t("Помню", "Got it")} <kbd className="hidden font-mono text-[11px] opacity-60 lg:inline">2</kbd></Button>
              </motion.div>
            ) : (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-center text-[13px] text-fg-3">
                {t("Вспомните ответ и нажмите на карточку", "Recall the answer, then tap the card")}<span className="hidden lg:inline">{t(" · пробел", " · space")}</span>
              </motion.p>
            )}
          </AnimatePresence>
          <p className="mt-3 text-center text-[12px] text-fg-3 lg:hidden">{t("После переворота можно смахнуть: вправо — помню, влево — нет", "After flipping you can swipe: right — got it, left — forgot")}</p>
        </>
      ) : (
        <Done ok={session.ok} again={session.again} daysTo={daysTo} onMore={() => { setQueue(buildQueue(pool, cards, true)); setI(0); setFlipped(false); }} />
      )}
    </div>
  );
}

function FlipCard({ card, en, flipped, box, onFlip, onSwipe }: {
  card: Card; en: boolean; flipped: boolean; box: number; onFlip: () => void; onSwipe: (ok: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const okOpacity = useTransform(x, [30, 120], [0, 1]);
  const noOpacity = useTransform(x, [-120, -30], [1, 0]);
  const front = en && card.en ? card.en.front : card.front;
  const back = en && card.en ? card.en.back : card.back;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: x.get() > 0 ? 300 : x.get() < 0 ? -300 : 0, transition: { duration: 0.25 } }}
      style={{ x, rotate }} drag={flipped ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.9}
      onDragEnd={(_, info) => { if (info.offset.x > 110) onSwipe(true); else if (info.offset.x < -110) onSwipe(false); }}
      className="relative [perspective:1400px]"
    >
      <motion.button type="button" onClick={onFlip} aria-label={flipped ? back : front}
        animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative block h-[300px] w-full [transform-style:preserve-3d] lg:h-[340px]">
        <Face>
          <span className="font-mono text-[11.5px] tracking-[.12em] text-fg-3 uppercase">{en ? "Question" : "Вопрос"}</span>
          <p className="my-auto text-center text-[clamp(20px,5.4vw,28px)] leading-snug font-semibold text-balance">{front}</p>
          <Boxes box={box} />
        </Face>
        <Face back>
          <span className="font-mono text-[11.5px] tracking-[.12em] uppercase opacity-60">{en ? "Answer" : "Ответ"}</span>
          <p className="my-auto text-center text-[clamp(20px,5.4vw,28px)] leading-snug font-semibold text-balance">{back}</p>
          <span className="text-center text-[12.5px] opacity-60">{front}</span>
        </Face>
      </motion.button>
      <motion.span style={{ opacity: okOpacity }} className="pointer-events-none absolute top-4 right-4 rounded-lg bg-accent px-3 py-1 text-[13px] font-bold text-on-accent">{en ? "Got it" : "Помню"}</motion.span>
      <motion.span style={{ opacity: noOpacity }} className="pointer-events-none absolute top-4 left-4 rounded-lg bg-fg px-3 py-1 text-[13px] font-bold text-bg">{en ? "Forgot" : "Не помню"}</motion.span>
    </motion.div>
  );
}

function Face({ children, back }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div className={cn("absolute inset-0 flex flex-col rounded-[22px] border p-6 [backface-visibility:hidden]",
      back ? "border-accent bg-accent text-on-accent [transform:rotateY(180deg)]" : "border-line-2 bg-bg-2")}>
      {children}
    </div>
  );
}

/** Пять квадратиков — в какой «коробке» карточка */
function Boxes({ box }: { box: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label={`box ${box} / 5`}>
      {[1, 2, 3, 4, 5].map(n => <i key={n} className={cn("size-2.5", n <= box ? "bg-fg" : "bg-line-2")} />)}
    </div>
  );
}

function Done({ ok, again, daysTo, onMore }: { ok: number; again: number; daysTo: number; onMore: () => void }) {
  const t = useT();
  useEffect(() => { if (ok) setTimeout(() => burst(document.getElementById("cards-done")), 200); }, [ok]);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-[22px] border border-line p-6 text-center">
      <p id="cards-done" className="mx-auto font-display text-[44px] leading-none font-black tracking-[-.03em]">{t("Готово", "Done")}</p>
      <p className="mt-3 text-[14px] text-fg-2">
        {ok + again > 0
          ? t(`Помню: ${ok} · повторил: ${again}. `, `Got it: ${ok} · repeated: ${again}. `)
          : ""}
        {daysTo > 0
          ? t(`Следующие карточки — через ${daysTo} ${pl(daysTo, ["день", "дня", "дней"], ["day", "days"])}.`, `Next cards in ${daysTo} ${daysTo === 1 ? "day" : "days"}.`)
          : t("На сегодня всё.", "That's all for today.")}
      </p>
      <Button variant="outline" className="mt-5" onClick={onMore}><RotateCcw /> {t("Пройти все карточки ещё раз", "Go through all cards again")}</Button>
    </motion.div>
  );
}
