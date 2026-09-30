import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ArrowRight, Check, Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { APP_NAME, BUILD, SUBJECTS } from "@/lib/data";
import { applyLook } from "@/lib/fx";
import { Button, buttonVariants } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Wordmark } from "@/components/Wordmark";
import { Iphone } from "@/components/magicui/iphone";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Marquee } from "@/components/magicui/marquee";
import { FallingBooks } from "@/components/FallingBooks";
import { Qr } from "./Qr";
import { detectPlatform, useInstall, type Platform } from "./install";
import { cn } from "@/lib/utils";

const APP_URL = "/app/";

export function Landing() {
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  const detected = detectPlatform();

  // тема и акцент — те же, что выбраны в приложении на этом устройстве
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sotka") || "{}").state || {};
      applyLook(s.theme || "", s.accent || "mono");
    } catch { applyLook("", "mono"); }
  }, []);

  const scrollToSteps = (p: Platform) => {
    setPlatform(p);
    document.getElementById("install")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 py-3">
          <p className="m-0 flex items-center gap-2 font-display text-[15px] font-black tracking-[.06em]"><i className="inline-block size-2 bg-accent" />HUNDO</p>
          <span className="flex-1" />
          <a href={APP_URL} className="text-sm font-semibold text-fg-2 hover:text-fg">Открыть приложение</a>
        </div>
      </header>

      {/* Герой: логотип, ценность, кнопка установки под платформу, телефон со скриншотом */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]">
          <FallingBooks density={0.8} />
        </div>
        <div className="relative mx-auto grid max-w-[1080px] items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-[1.15fr_.85fr] md:pt-20 md:pb-20">
          <div>
            <BlurFade delay={0.05} duration={0.6}><Wordmark text={APP_NAME} className="max-w-[560px]" /></BlurFade>
            <BlurFade delay={0.2}>
              <h1 className="mt-6 max-w-[20ch] [text-shadow:0_0_8px_var(--bg),0_0_3px_var(--bg)] text-[clamp(24px,6vw,40px)] leading-[1.12] font-semibold tracking-[-.02em]">ИИ-репетитор для подготовки к ЕГЭ и ОГЭ</h1>
              <p className="mt-3 max-w-[46ch] text-[16px] text-fg-2 [text-shadow:0_0_6px_var(--bg),0_0_2px_var(--bg)]">Варианты в формате ФИПИ, проверка ответов и разбор каждой ошибки. Бесплатно, прямо в телефоне, без магазина приложений.</p>
            </BlurFade>
            <BlurFade delay={0.32} className="mt-7"><InstallCta platform={detected} onSteps={scrollToSteps} /></BlurFade>
          </div>
          <BlurFade delay={0.25} duration={0.7} direction="up" className="mx-auto w-full max-w-[280px] md:max-w-[320px]">
            <Iphone src="/screens/home.webp" aria-label="Главный экран приложения" />
          </BlurFade>
        </div>
      </section>

      <div className="border-y border-line">
        <Marquee pauseOnHover className="py-3 [--duration:36s] [--gap:2.5rem]">
          {[...SUBJECTS.map(s => s.name), "ЕГЭ", "ОГЭ", "Кодификатор ФИПИ"].map(t => (
            <span key={t} className="flex items-center gap-10 font-mono text-[12px] tracking-[.12em] whitespace-nowrap text-fg-3 uppercase">
              {t}<i className="size-1.5 bg-line-2" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* Экраны приложения — они же список возможностей */}
      <section className="mx-auto max-w-[1080px] px-4 py-16">
        <Eyebrow>Что внутри</Eyebrow>
        <h2 className="mt-3 max-w-[22ch] font-display text-[clamp(24px,5vw,36px)] leading-[1.1] font-bold tracking-[-.02em]">Репетитор, который объясняет, а не просто даёт ответ</h2>
        <div className="scroll-x -mx-4 mt-10 flex snap-x gap-6 px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:px-0">
          {[
            { src: "/screens/variant.webp", t: "Варианты от ИИ", d: "Нейросеть составляет вариант в формате ФИПИ, проверяет ответы и оценивает часть 2 по критериям." },
            { src: "/screens/chat.webp", t: "Разбор ошибок", d: "Вставьте задание с «Сдам ГИА» или спросите тему — репетитор объяснит по шагам." },
            { src: "/screens/train.webp", t: "Тренажёр", d: "Задания с разборами, поле ответа в клеточку, как в бланке. Работает без интернета." },
          ].map((f, i) => (
            <BlurFade key={f.t} inView delay={i * 0.08} className="w-[70%] flex-none snap-center md:w-auto">
              <Iphone src={f.src} aria-label={f.t} className="max-w-[260px]" />
              <h3 className="mt-5 text-[17px] font-bold">{f.t}</h3>
              <p className="mt-1 max-w-[34ch] text-[14px] text-fg-2">{f.d}</p>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* Установка по шагам */}
      <section id="install" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto grid max-w-[1080px] gap-10 px-4 py-16 md:grid-cols-[1fr_320px]">
          <div>
            <Eyebrow>Установка</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(24px,5vw,36px)] leading-[1.1] font-bold tracking-[-.02em]">Меньше минуты, без App Store и Google Play</h2>
            <div className="mt-7 max-w-[420px]">
              <Segmented id="platform" value={platform} onChange={v => setPlatform(v)}
                items={[["ios", "iPhone"], ["android", "Android"], ["desktop", "Компьютер"]]} />
            </div>
            <AnimatePresence mode="wait">
              <motion.ol key={platform} className="mt-7 grid gap-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
                {STEPS[platform].map((s, i) => (
                  <li key={i} className="flex gap-4 rounded-[14px] border border-line p-4">
                    <span className="w-9 flex-none font-display text-[22px] leading-none font-black tracking-[-.03em] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 text-[15px] leading-snug">{s}</span>
                  </li>
                ))}
              </motion.ol>
            </AnimatePresence>
          </div>
          <aside className="hidden self-start rounded-[18px] border border-line p-5 md:sticky md:top-24 md:block">
            <p className="text-[15px] font-semibold">Откройте на телефоне</p>
            <p className="mt-1 text-[13px] text-fg-2">Наведите камеру на код — сайт откроется, и приложение можно будет установить.</p>
            <Qr value={location.origin + "/"} className="mt-4 w-full rounded-lg border border-line" />
            <p className="mt-3 truncate text-center font-mono text-[12px] text-fg-3">{location.host}</p>
          </aside>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-[18ch] font-display text-[clamp(24px,5vw,36px)] leading-[1.1] font-bold tracking-[-.02em]">До экзамена меньше, чем кажется</h2>
          <InstallCta platform={detected} onSteps={scrollToSteps} compact />
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap justify-between gap-3 px-4 py-6 font-mono text-[11.5px] text-fg-3">
          <span>HUNDO · школьный проект · задания: ФИПИ, Сдам ГИА</span>
          <span>сборка {BUILD.version}{BUILD.date ? " · " + BUILD.date : ""}</span>
        </div>
      </footer>
    </MotionConfig>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[.12em] text-fg-3 uppercase"><i className="size-1.5 bg-accent" />{children}</p>;
}

const STEPS: Record<Platform, React.ReactNode[]> = {
  ios: [
    <>Откройте этот сайт в <b>Safari</b> (или в Chrome на iOS 16.4+)</>,
    <>Нажмите <b className="inline-flex items-center gap-1">«Поделиться» <Share className="size-4" /></b> внизу экрана</>,
    <>Выберите <b className="inline-flex items-center gap-1">«На экран „Домой“» <SquarePlus className="size-4" /></b></>,
    <>Нажмите <b>«Добавить»</b> — иконка HUNDO появится рядом с другими приложениями</>,
  ],
  android: [
    <>Откройте этот сайт в <b>Chrome</b> или Яндекс Браузере</>,
    <>Нажмите кнопку <b>«Установить приложение»</b> выше или меню <b className="inline-flex items-center gap-0.5"><EllipsisVertical className="size-4" /></b> → «Установить приложение»</>,
    <>В других браузерах пункт называется <b>«Добавить на главный экран»</b></>,
    <>Иконка HUNDO появится на главном экране — открывайте как обычное приложение</>,
  ],
  desktop: [
    <>Откройте сайт в <b>Chrome</b>, <b>Edge</b> или Яндекс Браузере</>,
    <>Нажмите <b>«Установить на компьютер»</b> или значок установки в адресной строке</>,
    <>Приложение откроется в отдельном окне и появится в меню программ</>,
    <>Чтобы поставить на телефон — наведите камеру на QR-код справа</>,
  ],
};

/** Главная кнопка: на Android и компьютере ставит в одно нажатие, на iPhone показывает шаги */
function InstallCta({ platform, onSteps, compact }: { platform: Platform; onSteps: (p: Platform) => void; compact?: boolean }) {
  const { canPrompt, installed, prompt } = useInstall();
  const [done, setDone] = useState(false);

  if (installed || done) return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 text-[15px] font-semibold"><Check className="size-5 text-accent" /> Установлено</span>
      <a href={APP_URL} className={buttonVariants()}>Открыть <ArrowRight /></a>
    </div>
  );

  const main = canPrompt
    ? { label: platform === "desktop" ? "Установить на компьютер" : "Установить приложение", icon: <Download />, act: async () => { if (await prompt()) setDone(true); } }
    : platform === "ios"
      ? { label: "Как установить на iPhone", icon: <ArrowRight />, act: () => onSteps("ios") }
      : platform === "android"
        ? { label: "Установить приложение", icon: <Download />, act: () => onSteps("android") }
        : { label: "Открыть приложение", icon: <ArrowRight />, act: () => { location.href = APP_URL; } };

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", compact && "md:justify-end")}>
      <Button size="lg" onClick={main.act}>{main.label} {main.icon}</Button>
      {!(platform === "desktop" && !canPrompt) && (
        <a href={APP_URL} className="group inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-fg-2 hover:text-fg">
          Открыть без установки <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </a>
      )}
    </div>
  );
}
