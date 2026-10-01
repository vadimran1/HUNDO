import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ArrowRight, Check, Download, EllipsisVertical, Monitor, Play, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { APP_NAME, BUILD, subjects } from "@/lib/data";
import { applyLook } from "@/lib/fx";
import { useT, type Lang } from "@/lib/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Wordmark } from "@/components/Wordmark";
import { Iphone } from "@/components/magicui/iphone";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Marquee } from "@/components/magicui/marquee";
import { FallingBooks } from "@/components/FallingBooks";
import { LangSwitch } from "@/components/LangSwitch";
import { Qr } from "./Qr";
import { detectPlatform, useInstall, type Platform } from "./install";
import { cn } from "@/lib/utils";

const APP_URL = "/app/";
type Phone = "ios" | "android";
const shot = (lang: Lang, name: string) => `/screens/${lang}/${name}.webp`;
type Cut = "hype" | "calm";
const promo = (lang: Lang, cut: Cut) => `/promo/hundo-${cut === "hype" ? "hype-" : ""}${lang}.mp4`;
const poster = (lang: Lang, cut: Cut) => `/promo/poster-${cut === "hype" ? "hype-" : ""}${lang}.webp`;

export function Landing() {
  const t = useT();
  const detected = detectPlatform();
  const [phone, setPhone] = useState<Phone>(detected === "android" ? "android" : "ios");
  const [qrOpen, setQrOpen] = useState(false);
  const [cut, setCut] = useState<Cut>("hype");

  // тема и акцент — те же, что выбраны в приложении на этом устройстве
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sotka") || "{}").state || {};
      applyLook(s.theme || "", s.accent || "mono");
    } catch { applyLook("", "mono"); }
  }, []);
  useEffect(() => {
    document.title = t.en ? "HUNDO — AI tutor for the Russian state exams" : "HUNDO — ИИ-репетитор для ЕГЭ и ОГЭ";
  }, [t.en]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const showSteps = (p: Phone) => { setPhone(p); scrollTo("install"); };
  const shareUrl = location.origin + (t.en ? "/en" : "/");

  return (
    <MotionConfig reducedMotion="user">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-3 md:px-6">
          <p className="m-0 flex items-center gap-2 font-display text-[15px] font-black tracking-[.06em]"><i className="inline-block size-2 bg-accent" />HUNDO</p>
          <nav className="ml-8 hidden items-center gap-6 text-[14px] font-medium text-fg-2 lg:flex">
            <a href="#features" className="hover:text-fg">{t("Возможности", "Features")}</a>
            <a href="#desktop" className="hover:text-fg">{t("На компьютере", "On desktop")}</a>
            <a href="#video" className="hover:text-fg">{t("Ролик", "Video")}</a>
            <a href="#install" className="hover:text-fg">{t("Установка", "Install")}</a>
          </nav>
          <span className="flex-1" />
          <LangSwitch className="land" />
          <a href={APP_URL} className="hidden text-sm font-semibold text-fg-2 hover:text-fg sm:inline">{t("Открыть приложение", "Open the app")}</a>
        </div>
      </header>

      {/* Герой: логотип, ценность, кнопка под платформу, телефон со скриншотом */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-50 [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]">
          <FallingBooks density={0.8} />
        </div>
        <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-[1.15fr_.85fr] md:px-6 md:pt-20 md:pb-20">
          <div>
            <BlurFade delay={0.05} duration={0.6}><Wordmark text={APP_NAME} className="max-w-[600px]" /></BlurFade>
            <BlurFade delay={0.2}>
              <h1 className="mt-6 max-w-[20ch] text-[clamp(24px,6vw,44px)] leading-[1.1] font-semibold tracking-[-.02em]">
                {t("ИИ-репетитор для подготовки к ЕГЭ и ОГЭ", "AI tutor for the Russian state exams EGE and OGE")}
              </h1>
              <p className="mt-3 max-w-[48ch] text-[16px] text-fg-2 md:text-[17px]">
                {t("Варианты в формате ФИПИ, проверка ответов и разбор каждой ошибки. Бесплатно — в телефоне и на компьютере, без магазина приложений.",
                  "Mock exams in the official FIPI format, instant marking and an explanation for every mistake. Free — on your phone and on your computer, no app store needed.")}
              </p>
            </BlurFade>
            <BlurFade delay={0.32} className="mt-7">
              {detected === "desktop"
                ? <DesktopCta onPhone={() => setQrOpen(true)} onVideo={() => scrollTo("video")} />
                : <PhoneCta platform={detected} onSteps={showSteps} />}
            </BlurFade>
          </div>
          <BlurFade delay={0.25} duration={0.7} direction="up" className="mx-auto w-full max-w-[280px] md:max-w-[320px]">
            <Iphone src={shot(t.lang, "home")} aria-label={t("Главный экран приложения", "App home screen")} />
          </BlurFade>
        </div>
      </section>

      <div className="border-y border-line">
        <Marquee pauseOnHover className="py-3 [--duration:36s] [--gap:2.5rem]">
          {[...subjects().map(s => s.name), t("ЕГЭ", "EGE"), t("ОГЭ", "OGE"), t("Кодификатор ФИПИ", "FIPI codifier")].map(x => (
            <span key={x} className="flex items-center gap-10 font-mono text-[12px] tracking-[.12em] whitespace-nowrap text-fg-3 uppercase">
              {x}<i className="size-1.5 bg-line-2" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* Экраны приложения — они же список возможностей */}
      <section id="features" className="mx-auto max-w-[1180px] scroll-mt-16 px-4 py-16 md:px-6 md:py-24">
        <Eyebrow>{t("Что внутри", "What's inside")}</Eyebrow>
        <h2 className="mt-3 max-w-[22ch] font-display text-[clamp(24px,5vw,40px)] leading-[1.1] font-bold tracking-[-.02em]">
          {t("Репетитор, который объясняет, а не просто даёт ответ", "A tutor that explains, not just gives the answer")}
        </h2>
        <div className="scroll-x -mx-4 mt-10 flex snap-x gap-6 px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-10 md:px-0">
          {[
            { src: shot(t.lang, "variant"), h: t("Варианты от ИИ", "AI mock exams"), d: t("Нейросеть составляет вариант в формате ФИПИ, проверяет ответы и оценивает часть 2 по критериям.", "The AI writes a paper in the FIPI format, checks the answers and marks Part 2 against the official criteria.") },
            { src: shot(t.lang, "chat"), h: t("Разбор ошибок", "Mistakes explained"), d: t("Вставьте задание с «Сдам ГИА» или спросите тему — репетитор объяснит по шагам.", "Paste a task from Sdam GIA or ask about a topic — the tutor explains it step by step.") },
            { src: shot(t.lang, "train"), h: t("Тренажёр", "Practice"), d: t("Задания с разборами, поле ответа в клеточку, как в бланке. Работает без интернета.", "Tasks with solutions and an answer field in boxes like the real form. Works offline.") },
          ].map((f, i) => (
            <BlurFade key={f.h} inView delay={i * 0.08} className="w-[70%] flex-none snap-center md:w-auto">
              <Iphone src={f.src} aria-label={f.h} className="max-w-[260px]" />
              <h3 className="mt-5 text-[17px] font-bold">{f.h}</h3>
              <p className="mt-1 max-w-[34ch] text-[14px] text-fg-2">{f.d}</p>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* Версия для компьютера */}
      <section id="desktop" className="scroll-mt-16 border-t border-line bg-bg-2/40">
        <div className="mx-auto max-w-[1180px] px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Eyebrow>{t("На компьютере", "On desktop")}</Eyebrow>
              <h2 className="mt-3 max-w-[20ch] font-display text-[clamp(24px,5vw,40px)] leading-[1.1] font-bold tracking-[-.02em]">
                {t("Вся HUNDO в браузере — ничего не нужно скачивать", "All of HUNDO in your browser — nothing to download")}
              </h2>
              <p className="mt-3 max-w-[56ch] text-[15.5px] text-fg-2">
                {t("Боковое меню, широкие экраны для вариантов и чата, горячие клавиши 1–5 для разделов и Enter для проверки. Удобно решать пробники за столом, а повторять — с телефона.",
                  "A sidebar, wide screens for mock exams and chat, keys 1–5 to switch sections and Enter to check an answer. Sit full mock exams at your desk and review on your phone.")}
              </p>
            </div>
            <a href={APP_URL} className={cn(buttonVariants({ size: "lg" }), "justify-self-start")}><Monitor /> {t("Открыть веб-версию", "Open the web app")}</a>
          </div>
          <BlurFade inView className="mt-10">
            <BrowserFrame src={shot(t.lang, "desktop-home")} alt={t("HUNDO на компьютере", "HUNDO on a desktop")} />
          </BlurFade>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              [t("Без установки", "No install"), t("открывается по ссылке в Chrome, Edge, Safari, Яндекс Браузере", "opens from a link in Chrome, Edge, Safari or Firefox")],
              [t("Горячие клавиши", "Keyboard shortcuts"), t("1–5 — разделы, Enter — проверить и дальше", "1–5 for sections, Enter to check and go on")],
              [t("Два языка", "Two languages"), t("русский и английский — переключатель RU / EN", "Russian and English — the RU / EN switch")],
            ].map(([a, b]) => (
              <div key={a} className="rounded-[14px] border border-line bg-bg p-4">
                <b className="block text-[15px]">{a}</b>
                <span className="text-[13.5px] text-fg-2">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Промо-ролик */}
      <section id="video" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto max-w-[1180px] px-4 py-16 md:px-6 md:py-24">
          <Eyebrow>{t("Ролик", "Video")}</Eyebrow>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(24px,5vw,40px)] leading-[1.1] font-bold tracking-[-.02em]">{t("HUNDO за 30 секунд", "HUNDO in 30 seconds")}</h2>
            <div className="w-full max-w-[340px]">
              <Segmented id="cut" value={cut} onChange={v => setCut(v)} items={[["hype", t("Под бит", "On the beat")], ["calm", t("Спокойный", "Calm")]]} />
            </div>
          </div>
          <BlurFade inView className="mt-8">
            <div className="overflow-hidden rounded-[18px] border border-line-2 bg-black">
              <video key={t.lang + cut} className="block aspect-video w-full" controls playsInline preload="metadata" poster={poster(t.lang, cut)}>
                <source src={promo(t.lang, cut)} type="video/mp4" />
              </video>
            </div>
          </BlurFade>
          <a href={promo(t.lang, cut)} download className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-fg-2 hover:text-fg">
            <Download className="size-4" /> {t("Скачать ролик (MP4)", "Download the video (MP4)")}
          </a>
        </div>
      </section>

      {/* Установка по шагам — только телефон */}
      <section id="install" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-16 md:grid-cols-[1fr_340px] md:px-6 md:py-24">
          <div>
            <Eyebrow>{t("Установка на телефон", "Install on your phone")}</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(24px,5vw,40px)] leading-[1.1] font-bold tracking-[-.02em]">{t("Меньше минуты, без App Store и Google Play", "Under a minute, no App Store or Google Play")}</h2>
            <div className="mt-7 max-w-[360px]">
              <Segmented id="platform" value={phone} onChange={v => setPhone(v)} items={[["ios", "iPhone"], ["android", "Android"]]} />
            </div>
            <AnimatePresence mode="wait">
              <motion.ol key={phone + t.lang} className="mt-7 grid gap-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
                <Steps phone={phone} />
              </motion.ol>
            </AnimatePresence>
          </div>
          <aside className="hidden self-start rounded-[18px] border border-line p-5 md:sticky md:top-24 md:block">
            <p className="text-[15px] font-semibold">{t("Откройте на телефоне", "Open on your phone")}</p>
            <p className="mt-1 text-[13px] text-fg-2">{t("Наведите камеру на код — сайт откроется, и приложение можно будет установить.", "Point your camera at the code — the site opens and you can install the app.")}</p>
            <Qr value={shareUrl} className="mt-4 w-full rounded-lg border border-line" />
            <p className="mt-3 truncate text-center font-mono text-[12px] text-fg-3">{shareUrl.replace(/^https?:\/\//, "")}</p>
          </aside>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-6">
          <h2 className="max-w-[18ch] font-display text-[clamp(24px,5vw,40px)] leading-[1.1] font-bold tracking-[-.02em]">{t("До экзамена меньше, чем кажется", "The exam is closer than it seems")}</h2>
          {detected === "desktop"
            ? <DesktopCta onPhone={() => setQrOpen(true)} compact />
            : <PhoneCta platform={detected} onSteps={showSteps} compact />}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3 px-4 py-6 font-mono text-[11.5px] text-fg-3 md:px-6">
          <span>HUNDO · {t("школьный проект · задания: ФИПИ, Сдам ГИА", "school project · tasks: FIPI, Sdam GIA")}</span>
          <span>{t("сборка", "build")} {BUILD.version}{BUILD.date && !t.en ? " · " + BUILD.date : ""}</span>
        </div>
      </footer>

      <PhoneDialog open={qrOpen} onClose={() => setQrOpen(false)} url={shareUrl} />
    </MotionConfig>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-2.5 font-mono text-[12px] tracking-[.12em] text-fg-3 uppercase"><i className="size-1.5 bg-accent" />{children}</p>;
}

/** Окно браузера со скриншотом версии для компьютера */
function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line-2 bg-bg shadow-[0_30px_80px_-20px_rgba(0,0,0,.35)]">
      <div className="flex items-center gap-2 border-b border-line bg-bg-2 px-4 py-2.5">
        <i className="size-2.5 rounded-full bg-line-2" /><i className="size-2.5 rounded-full bg-line-2" /><i className="size-2.5 rounded-full bg-line-2" />
        <span className="mx-auto truncate rounded-md bg-bg px-10 py-1 font-mono text-[11.5px] text-fg-3 sm:px-24">{location.host}/app</span>
      </div>
      <img src={src} alt={alt} loading="lazy" className="block aspect-[16/10] w-full object-cover object-top" />
    </div>
  );
}

function Steps({ phone }: { phone: Phone }) {
  const t = useT();
  const items: React.ReactNode[] = phone === "ios" ? [
    <>{t("Откройте этот сайт в ", "Open this site in ")}<b>Safari</b>{t(" (или в Chrome на iOS 16.4+)", " (or Chrome on iOS 16.4+)")}</>,
    <>{t("Нажмите ", "Tap ")}<b className="inline-flex items-center gap-1">{t("«Поделиться»", "Share")} <Share className="size-4" /></b>{t(" внизу экрана", " at the bottom of the screen")}</>,
    <>{t("Выберите ", "Choose ")}<b className="inline-flex items-center gap-1">{t("«На экран „Домой“»", "Add to Home Screen")} <SquarePlus className="size-4" /></b></>,
    <>{t("Нажмите ", "Tap ")}<b>{t("«Добавить»", "Add")}</b>{t(" — иконка HUNDO появится рядом с другими приложениями", " — the HUNDO icon appears next to your other apps")}</>,
  ] : [
    <>{t("Откройте этот сайт в ", "Open this site in ")}<b>Chrome</b>{t(" или Яндекс Браузере", " or Samsung Internet")}</>,
    <>{t("Нажмите кнопку ", "Tap the ")}<b>{t("«Установить приложение»", "Install app")}</b>{t(" выше или меню ", " button above, or the menu ")}<b className="inline-flex items-center gap-0.5"><EllipsisVertical className="size-4" /></b>{t(" → «Установить приложение»", " → Install app")}</>,
    <>{t("В других браузерах пункт называется ", "In other browsers it's called ")}<b>{t("«Добавить на главный экран»", "Add to Home screen")}</b></>,
    <>{t("Иконка HUNDO появится на главном экране — открывайте как обычное приложение", "The HUNDO icon appears on your home screen — open it like any other app")}</>,
  ];
  return <>{items.map((s, i) => (
    <li key={i} className="flex gap-4 rounded-[14px] border border-line p-4">
      <span className="w-9 flex-none font-display text-[22px] leading-none font-black tracking-[-.03em] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
      <span className="min-w-0 text-[15px] leading-snug">{s}</span>
    </li>
  ))}</>;
}

/** На компьютере: главная кнопка — «Скачать на телефон» (QR), рядом — веб-версия */
function DesktopCta({ onPhone, onVideo, compact }: { onPhone: () => void; onVideo?: () => void; compact?: boolean }) {
  const t = useT();
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", compact && "md:justify-end")}>
      <Button size="lg" onClick={onPhone}><Smartphone /> {t("Скачать на телефон", "Get it on your phone")}</Button>
      <a href={APP_URL} className={buttonVariants({ size: "lg", variant: "outline" })}><Monitor /> {t("Веб-версия", "Web app")}</a>
      {onVideo && (
        <button onClick={onVideo} className="group inline-flex items-center gap-2 text-[14.5px] font-semibold text-fg-2 hover:text-fg">
          <span className="grid size-8 place-items-center rounded-full border border-line-2 transition-colors group-hover:border-fg"><Play className="size-3.5 translate-x-px" /></span>
          {t("Смотреть ролик", "Watch the video")}
        </button>
      )}
    </div>
  );
}

/** На телефоне: на Android ставит в одно нажатие, на iPhone показывает шаги */
function PhoneCta({ platform, onSteps, compact }: { platform: Platform; onSteps: (p: Phone) => void; compact?: boolean }) {
  const { canPrompt, installed, prompt } = useInstall();
  const [done, setDone] = useState(false);
  const t = useT();

  if (installed || done) return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 text-[15px] font-semibold"><Check className="size-5 text-accent" /> {t("Установлено", "Installed")}</span>
      <a href={APP_URL} className={buttonVariants()}>{t("Открыть", "Open")} <ArrowRight /></a>
    </div>
  );

  const main = canPrompt
    ? { label: t("Установить приложение", "Install the app"), icon: <Download />, act: async () => { if (await prompt()) setDone(true); } }
    : platform === "ios"
      ? { label: t("Как установить на iPhone", "How to install on iPhone"), icon: <ArrowRight />, act: () => onSteps("ios") }
      : { label: t("Установить приложение", "Install the app"), icon: <Download />, act: () => onSteps("android") };

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", compact && "md:justify-end")}>
      <Button size="lg" onClick={main.act}>{main.label} {main.icon}</Button>
      <a href={APP_URL} className="group inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-fg-2 hover:text-fg">
        {t("Открыть без установки", "Open without installing")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </a>
    </div>
  );
}

/** Окно «Скачать на телефон»: QR-код и короткие шаги для iPhone и Android */
function PhoneDialog({ open, onClose, url }: { open: boolean; onClose: () => void; url: string }) {
  const t = useT();
  const [p, setP] = useState<Phone>("ios");
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-80 grid place-items-center bg-black/50 p-4 backdrop-blur-[3px]" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={t("Скачать на телефон", "Get it on your phone")} onClick={e => e.stopPropagation()}
            className="relative grid w-full max-w-[760px] gap-8 rounded-[22px] border border-line-2 bg-bg p-6 shadow-[0_40px_100px_-20px_rgba(0,0,0,.5)] md:grid-cols-[280px_1fr] md:p-8"
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}>
            <button onClick={onClose} aria-label={t("Закрыть", "Close")} className="absolute top-4 right-4 grid size-9 place-items-center rounded-lg border border-line text-fg-2 hover:text-fg"><X className="size-4" /></button>
            <div>
              <Qr value={url} className="w-full rounded-xl border border-line" />
              <p className="mt-3 text-center font-mono text-[12px] text-fg-3">{url.replace(/^https?:\/\//, "")}</p>
            </div>
            <div>
              <p className="flex items-center gap-2.5 font-mono text-[12px] tracking-[.12em] text-fg-3 uppercase"><i className="size-1.5 bg-accent" />{t("Скачать на телефон", "Get it on your phone")}</p>
              <h3 className="mt-2.5 font-display text-[26px] leading-[1.1] font-bold tracking-[-.02em]">{t("Наведите камеру телефона на код", "Point your phone's camera at the code")}</h3>
              <p className="mt-2 text-[14px] text-fg-2">{t("Откроется сайт HUNDO. Дальше — пара нажатий, и приложение появится на главном экране. Без App Store и Google Play.", "The HUNDO site opens. A couple of taps later the app is on your home screen. No App Store or Google Play.")}</p>
              <div className="mt-5 max-w-[300px]"><Segmented id="dlg-platform" value={p} onChange={v => setP(v)} items={[["ios", "iPhone"], ["android", "Android"]]} /></div>
              <ol className="mt-4 grid gap-2 text-[14px]">
                {(p === "ios"
                  ? [t("Safari → «Поделиться»", "Safari → Share"), t("«На экран „Домой“»", "Add to Home Screen"), t("«Добавить»", "Add")]
                  : [t("Chrome → меню ⋮", "Chrome → menu ⋮"), t("«Установить приложение»", "Install app"), t("«Установить»", "Install")]
                ).map((s, i) => (
                  <li key={s} className="flex items-center gap-3"><span className="w-6 font-display font-black text-fg-3">{i + 1}</span>{s}</li>
                ))}
              </ol>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
