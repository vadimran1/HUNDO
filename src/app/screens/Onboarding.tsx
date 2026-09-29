import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useApp, useUI } from "@/lib/store";
import { APP_NAME, SUBJECTS } from "@/lib/data";
import type { SubjectId } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/controls";
import { Wordmark } from "@/components/Wordmark";
import { BlurFade } from "@/components/magicui/blur-fade";
import { shake } from "@/lib/fx";
import { cn } from "@/lib/utils";

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -30 }),
};

export function Onboarding() {
  const step = useUI(s => s.onbStep);
  const [dir, setDir] = useState(1);
  const set = (n: number) => { setDir(n > step ? 1 : -1); useUI.setState({ onbStep: n }); };

  return (
    <div className="relative min-h-[calc(100dvh-env(safe-area-inset-top,0px))] overflow-hidden">
      {step === 0 && (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] opacity-80 [mask-image:radial-gradient(ellipse_at_50%_42%,#000,transparent_72%)]" />
      )}
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto max-w-[560px] px-4">
          {step === 0 && <Title onStart={() => set(1)} />}
          {step === 1 && <ExamStep onBack={() => set(0)} onNext={() => set(2)} />}
          {step === 2 && <SubjectsStep onBack={() => set(1)} onNext={() => set(3)} />}
          {step === 3 && <DateStep onBack={() => set(2)} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Title({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex min-h-[calc(100dvh-env(safe-area-inset-top,0px)-24px)] flex-col pt-4">
      <div className="flex flex-1 flex-col justify-center gap-6 py-8">
        <BlurFade delay={0.05} duration={0.6}><Wordmark text={APP_NAME} /></BlurFade>
        <BlurFade delay={0.25}>
          <h1 className="m-0 max-w-[22ch] text-[clamp(20px,5.6vw,26px)] leading-tight font-semibold tracking-[-.01em]">ИИ-репетитор для подготовки к ЕГЭ и ОГЭ</h1>
        </BlurFade>
      </div>
      <BlurFade delay={0.4} className="pb-6">
        <Button className="w-full" size="lg" onClick={onStart}>Начать <ArrowRight /></Button>
      </BlurFade>
    </section>
  );
}

function Steps({ n }: { n: number }) {
  return (
    <div className="mt-7 mb-6 flex gap-1.5">
      {[1, 2, 3].map(i => (
        <i key={i} className="relative h-[3px] flex-1 overflow-hidden rounded-sm bg-line">
          <motion.span className="absolute inset-0 origin-left bg-accent" initial={{ scaleX: i < n ? 1 : 0 }} animate={{ scaleX: i <= n ? 1 : 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
        </i>
      ))}
    </div>
  );
}

const H = ({ children }: { children: React.ReactNode }) =>
  <h2 className="mb-2.5 font-display text-[clamp(24px,7vw,32px)] leading-[1.12] font-bold tracking-[-.02em]">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-6 text-fg-2">{children}</p>;

function Nav({ onBack, onNext, next = "Дальше" }: { onBack: () => void; onNext: () => void; next?: string }) {
  return (
    <div className="mt-6 flex gap-2">
      <Button variant="outline" onClick={onBack}>Назад</Button>
      <Button className="flex-1" onClick={onNext}>{next} <ArrowRight /></Button>
    </div>
  );
}

function ExamStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const exam = useApp(s => s.exam);
  const patch = useApp(s => s.patch);
  const opts = [
    { v: "ЕГЭ" as const, sub: "11 класс", date: "2027-05-27" },
    { v: "ОГЭ" as const, sub: "9 класс", date: "2027-05-25" },
  ];
  return (
    <>
      <Steps n={1} />
      <H>Какой экзамен сдаёте?</H>
      <P>От этого зависят формат заданий, источники и дата.</P>
      <div className="grid gap-2.5">
        {opts.map(o => {
          const on = exam === o.v;
          return (
            <motion.button key={o.v} whileTap={{ scale: 0.98 }} aria-pressed={on}
              onClick={() => patch({ exam: o.v, examDate: o.date })}
              className={cn("flex items-center gap-4 rounded-[14px] border p-[18px] text-left transition-colors", on ? "border-fg bg-bg-2" : "border-line-2 bg-bg")}>
              <b className="min-w-[84px] font-display text-[26px] font-black tracking-[-.02em]">{o.v}</b>
              <span className="text-[13.5px] text-fg-2">{o.sub}</span>
              <i className={cn("ml-auto grid size-5 flex-none place-items-center rounded-full border-[1.5px]", on ? "border-fg" : "border-line-2")}>
                {on && <motion.span layoutId="exam-dot" className="size-2.5 rounded-full bg-accent" />}
              </i>
            </motion.button>
          );
        })}
      </div>
      <Nav onBack={onBack} onNext={onNext} />
    </>
  );
}

function SubjectsStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const subjects = useApp(s => s.subjects);
  const patch = useApp(s => s.patch);
  const [pick, setPick] = useState<Set<SubjectId>>(new Set(subjects));
  const [hint, setHint] = useState("");
  const chips = useRef<HTMLDivElement>(null);
  return (
    <>
      <Steps n={2} />
      <H>Какие предметы?</H>
      <P>Выберите все, что сдаёте. Задания, варианты и план будут по ним.</P>
      <div ref={chips} className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => (
          <Chip key={s.id} pressed={pick.has(s.id)} onClick={() => {
            const n = new Set(pick); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setPick(n); setHint("");
          }}>{s.name}</Chip>
        ))}
      </div>
      <p className="mt-2 min-h-5 text-[12.5px] text-fg-3">{hint}</p>
      <Nav onBack={onBack} onNext={() => {
        if (!pick.size) { setHint("Выберите хотя бы один предмет."); shake(chips.current); return; }
        patch({ subjects: [...pick] }); onNext();
      }} />
    </>
  );
}

function DateStep({ onBack }: { onBack: () => void }) {
  const examDate = useApp(s => s.examDate);
  const patch = useApp(s => s.patch);
  const touch = useApp(s => s.touchStreak);
  const [d, setD] = useState(examDate);
  return (
    <>
      <Steps n={3} />
      <H>Когда экзамен?</H>
      <P>Приложение будет считать дни и подгонять план под оставшееся время.</P>
      <label className="block">
        <span className="mb-2 block text-[13px] font-medium text-fg-3">Дата первого экзамена</span>
        <input type="date" className="field" value={d} onChange={e => setD(e.target.value)} />
      </label>
      <p className="mt-2 text-[12.5px] text-fg-3">Точное расписание публикуют зимой. Дату всегда можно поменять в настройках.</p>
      <Nav onBack={onBack} next="Начать подготовку" onNext={() => {
        patch({ examDate: d || examDate, onboarded: true }); touch();
        useUI.setState({ tab: "home", dir: 1, onbStep: 0 }); window.scrollTo(0, 0);
      }} />
    </>
  );
}
