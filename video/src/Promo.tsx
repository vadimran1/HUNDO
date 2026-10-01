import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AbsoluteFill, Easing, Img, Sequence, continueRender, delayRender, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";

export const FPS = 30;
export const PROMO_FRAMES = 900; // 30 секунд

type Lang = "ru" | "en";
export const C = { bg: "#0a0a0a", bg2: "#161616", bg3: "#202020", fg: "#f5f5f5", fg2: "#d4d4d4", fg3: "#9e9e9e", line: "#262626", line2: "#3a3a3a" };
export const DISPLAY = "Unbounded, 'Arial Black', sans-serif";
export const SANS = "Onest, system-ui, sans-serif";
export const MONO = "JetBrains Mono, monospace";
export const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

// Сцены: [начало, конец] в кадрах
const S = {
  icon: [0, 105], word: [105, 195], problem: [195, 315], count: [315, 435],
  exam: [435, 585], chat: [585, 720], desk: [720, 810], end: [810, 900],
} as const;

const TXT = {
  ru: {
    hundo: "«Hundo» — это «сотка»: 100 баллов",
    tagline: "ИИ-репетитор для подготовки к ЕГЭ и ОГЭ",
    problem: ["Заданий — тысячи.", "Объяснений — нет.", "Репетитор — дорого."],
    answer: "Поэтому — HUNDO.",
    e1: "01 · отсчёт", days: "дней до ЕГЭ", h1: "Знает, сколько осталось,\nи строит план",
    e2: "02 · вариант от ИИ", h2: "Вариант в формате ФИПИ —\nза минуту",
    log: ["подключаюсь к нейросети", "> задание 01 готово", "> задание 02 готово", "> задание 03 готово", "> задание 04 готово", "> задание 05 готово", "проверяю ответы"],
    score: "первичных баллов", e3: "03 · разбор ошибок", h3: "Объясняет каждую ошибку",
    q: "Почему 1703, а не 1700?",
    a: "16 мая 1703 года заложили Петропавловскую крепость — это и есть дата основания Петербурга. 1700 — начало Северной войны: частая ловушка.",
    e4: "04 · на компьютере", h4: "Телефон, компьютер,\nрусский и английский",
    keys: ["1–5 разделы", "Enter — проверить", "RU / EN"],
    free: "Бесплатно. Без App Store и Google Play.", url: "hundo-tau.vercel.app",
  },
  en: {
    hundo: "“Hundo” means a hundred: 100 points",
    tagline: "AI tutor for the Russian state exams",
    problem: ["Thousands of tasks.", "Zero explanations.", "Tutors cost a lot."],
    answer: "So — HUNDO.",
    e1: "01 · countdown", days: "days until the exam", h1: "Knows how long is left\nand plans for it",
    e2: "02 · AI mock exam", h2: "A FIPI-format paper\nin a minute",
    log: ["connecting to the AI", "> task 01 ready", "> task 02 ready", "> task 03 ready", "> task 04 ready", "> task 05 ready", "marking answers"],
    score: "primary points", e3: "03 · mistakes explained", h3: "Explains every mistake",
    q: "Why 1703 and not 1700?",
    a: "The Peter and Paul Fortress was laid on 16 May 1703 — that's the founding date of St Petersburg. 1700 is when the Great Northern War began: a classic trap.",
    e4: "04 · on desktop", h4: "Phone, desktop,\nRussian and English",
    keys: ["1–5 sections", "Enter to check", "RU / EN"],
    free: "Free. No App Store or Google Play.", url: "hundo-tau.vercel.app/en",
  },
};

/* ---------- шрифты: ждём загрузки, иначе первые кадры будут системным шрифтом ---------- */
export function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces: [string, string, string][] = [];
    for (const [fam, file] of [["Unbounded", "unbounded"], ["Onest", "onest"], ["JetBrains Mono", "jetbrains-mono"]]) {
      faces.push([fam, `fonts/${file}-latin-wght-normal.woff2`, "U+0000-00FF, U+2000-206F, U+2190-21FF, U+2212"]);
      faces.push([fam, `fonts/${file}-cyrillic-wght-normal.woff2`, "U+0400-04FF"]);
    }
    Promise.all(faces.map(([fam, url, range]) => {
      const f = new FontFace(fam, `url(${staticFile(url)})`, { weight: "100 900", unicodeRange: range });
      document.fonts.add(f);
      return f.load();
    })).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
}

/* ---------- помощники анимации ---------- */
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const lerp = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: EASE });
function useSpring(delay = 0, cfg = { damping: 18, stiffness: 120, mass: 0.9 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: cfg });
}

/** Сцена: плавно появляется и уходит вверх с размытием */
function Scene({ range, children, out = 12 }: { range: readonly [number, number]; children: ReactNode; out?: number }) {
  const [a, b] = range;
  return (
    <Sequence from={a} durationInFrames={b - a}>
      <Fade len={b - a} out={out}>{children}</Fade>
    </Sequence>
  );
}
function Fade({ len, out, children }: { len: number; out: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const o = lerp(f, len - out, len, 1, 0);
  const y = lerp(f, len - out, len, 0, -30);
  const blur = lerp(f, len - out, len, 0, 10);
  return <AbsoluteFill style={{ opacity: o, transform: `translateY(${y}px)`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
}

/* ---------- падающие книжки (как на титульном экране приложения) ---------- */
export function Books({ opacity }: { opacity: number }) {
  const f = useCurrentFrame();
  const books = Array.from({ length: 34 }, (_, i) => {
    const x = random("x" + i) * 1920, w = 26 + random("w" + i) * 26, speed = 1.2 + random("s" + i) * 2.4;
    const y = ((random("y" + i) * 1300 + f * speed) % 1300) - 110;
    const rot = random("r" + i) * 360 + f * (random("v" + i) - 0.5) * 1.6;
    const open = random("o" + i) > 0.6;
    const shade = 40 + Math.floor(random("c" + i) * 50);
    return { x, y, w, rot, open, shade, i };
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={1920} height={1080}>
        {books.map(b => (
          <g key={b.i} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`}>
            {b.open ? (
              <>
                <path d={`M0 0 Q ${b.w * 0.5} ${-b.w * 0.12} ${b.w} 0 L ${b.w} ${b.w * 0.7} Q ${b.w * 0.5} ${b.w * 0.58} 0 ${b.w * 0.7} Z`} fill={`rgb(${b.shade},${b.shade},${b.shade})`} />
                <path d={`M0 0 Q ${-b.w * 0.5} ${-b.w * 0.12} ${-b.w} 0 L ${-b.w} ${b.w * 0.7} Q ${-b.w * 0.5} ${b.w * 0.58} 0 ${b.w * 0.7} Z`} fill={`rgb(${b.shade + 18},${b.shade + 18},${b.shade + 18})`} />
              </>
            ) : (
              <>
                <rect x={-b.w / 2} y={-b.w * 0.65} width={b.w} height={b.w * 1.3} rx={3} fill={`rgb(${b.shade},${b.shade},${b.shade})`} />
                <rect x={-b.w / 2} y={-b.w * 0.65} width={b.w * 0.16} height={b.w * 1.3} fill={`rgb(${b.shade + 25},${b.shade + 25},${b.shade + 25})`} />
              </>
            )}
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
}

/** Шкала из 40 делений внизу кадра — как отсчёт дней на главном экране приложения */
function Chrome({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const passed = Math.floor((f / PROMO_FRAMES) * 40);
  const scene = Object.values(S).findIndex(([a, b]) => f >= a && f < b) + 1;
  const show = lerp(f, 0, 20);
  return (
    <AbsoluteFill style={{ opacity: show }}>
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 56, display: "flex", alignItems: "flex-end", gap: 6, height: 18 }}>
        {Array.from({ length: 40 }, (_, i) => (
          <i key={i} style={{ flex: 1, height: i === passed ? 18 : 6, background: i === passed ? C.fg : i < passed ? "#7a7a7a" : C.line2 }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 90, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 18, letterSpacing: "0.14em", color: C.fg3, textTransform: "uppercase" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: DISPLAY, fontWeight: 900, color: C.fg, letterSpacing: "0.08em" }}>
          <i style={{ width: 12, height: 12, background: C.fg }} />HUNDO
        </span>
        <span>{lang === "ru" ? "ЕГЭ · ОГЭ" : "EGE · OGE"} · {String(Math.max(1, scene)).padStart(2, "0")}/08</span>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 1. «100» с двойным подчёркиванием ---------- */
function wave(y: number, amp: number, x0: number, x1: number, phase: number) {
  let d = "";
  for (let x = x0; x <= x1; x += 8) d += (x === x0 ? "M" : "L") + x + " " + (y + Math.sin((x - x0) / 95 + phase) * amp).toFixed(1) + " ";
  return d;
}
function IconScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const digits = ["1", "0", "0"];
  const draw1 = lerp(f, 26, 52), draw2 = lerp(f, 34, 60);
  const cap = lerp(f, 52, 70);
  const zoom = interpolate(f, [0, 105], [1.06, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
      <div style={{ display: "flex", gap: 6, fontFamily: DISPLAY, fontWeight: 900, fontSize: 330, lineHeight: 1, color: C.fg, letterSpacing: "-0.04em", marginTop: -90 }}>
        {digits.map((d, i) => <Digit key={i} d={d} delay={4 + i * 5} />)}
      </div>
      <svg width={900} height={120} style={{ marginTop: -10 }} viewBox="0 0 900 120">
        <path d={wave(40, 6, 150, 750, 0)} fill="none" stroke={C.fg} strokeWidth={16} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw1} />
        <path d={wave(84, 6, 170, 730, 0.7)} fill="none" stroke={C.fg} strokeWidth={16} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw2} />
      </svg>
      <p style={{ fontFamily: SANS, fontSize: 40, fontWeight: 500, color: C.fg2, marginTop: 30, opacity: cap, transform: `translateY(${(1 - cap) * 16}px)` }}>{TXT[lang].hundo}</p>
    </AbsoluteFill>
  );
}
function Digit({ d, delay }: { d: string; delay: number }) {
  const s = useSpring(delay, { damping: 14, stiffness: 140, mass: 0.8 });
  return <span style={{ display: "inline-block", transform: `translateY(${(1 - s) * 160}px) scale(${0.8 + s * 0.2})`, opacity: Math.min(1, s * 1.4), filter: `blur(${(1 - Math.min(1, s)) * 14}px)` }}>{d}</span>;
}

/* ---------- 2. Логотип HUNDO ---------- */
function WordScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const sub = lerp(f, 30, 50);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 900, fontSize: 300, lineHeight: 1, letterSpacing: "-0.03em", marginTop: -80 }}>
        {"HUNDO".split("").map((ch, i) => <Letter key={i} ch={ch} delay={i * 4} />)}
      </div>
      <p style={{ fontFamily: SANS, fontSize: 52, fontWeight: 600, color: C.fg, marginTop: 34, letterSpacing: "-0.01em", opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>{TXT[lang].tagline}</p>
    </AbsoluteFill>
  );
}
function Letter({ ch, delay }: { ch: string; delay: number }) {
  const s = useSpring(delay, { damping: 15, stiffness: 120, mass: 0.9 });
  return (
    <span style={{
      display: "inline-block", backgroundImage: `linear-gradient(${C.fg}, #8d8d8d)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      transform: `translateY(${(1 - s) * 120}px) rotate(${(1 - s) * 8}deg)`, opacity: Math.min(1, s * 1.5), filter: `blur(${Math.max(0, 1 - s) * 18}px)`,
    }}>{ch}</span>
  );
}

/* ---------- 3. Проблема ---------- */
function ProblemScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const t = TXT[lang];
  const dim = lerp(f, 72, 84, 1, 0.22);
  const ans = useSpring(76, { damping: 16, stiffness: 130, mass: 0.8 });
  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160 }}>
      {t.problem.map((line, i) => {
        const p = lerp(f, i * 18, i * 18 + 16);
        const strike = i === 0 ? 0 : lerp(f, 56 + i * 4, 70 + i * 4);
        return (
          <div key={i} style={{ position: "relative", alignSelf: "flex-start", fontFamily: DISPLAY, fontWeight: 800, fontSize: 104, lineHeight: 1.18, letterSpacing: "-0.03em", color: C.fg,
            opacity: p * dim, transform: `translateX(${(1 - p) * -60}px)` }}>
            {line}
            <i style={{ position: "absolute", left: 0, top: "54%", height: 10, width: `${strike * 100}%`, background: C.fg }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", right: 160, bottom: 200, fontFamily: DISPLAY, fontWeight: 900, fontSize: 92, letterSpacing: "-0.03em", color: C.bg, background: C.fg, padding: "18px 34px 24px", borderRadius: 22,
        transform: `scale(${0.6 + ans * 0.4}) rotate(${(1 - ans) * -6}deg)`, opacity: Math.min(1, ans * 1.6) }}>
        {t.answer}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- телефон и окно браузера ---------- */
export function Phone({ src, style, scrollY = 0 }: { src: string; style?: CSSProperties; scrollY?: number }) {
  return (
    <div style={{ width: 404, height: 836, borderRadius: 64, scale: 0.86, marginTop: -70, flex: "none", background: "#000", padding: 14, boxShadow: `0 0 0 2px ${C.line2}, 0 50px 120px rgba(0,0,0,.6)`, ...style }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 50, overflow: "hidden", background: C.bg }}>
        <Img src={staticFile(src)} style={{ width: "100%", display: "block", transform: `translateY(${-scrollY}px)` }} />
        <i style={{ position: "absolute", top: 12, left: "50%", width: 112, height: 32, marginLeft: -56, borderRadius: 20, background: "#000" }} />
      </div>
    </div>
  );
}
function Eyebrow({ children, p }: { children: ReactNode; p: number }) {
  return (
    <p style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 24, letterSpacing: "0.14em", textTransform: "uppercase", color: C.fg3, opacity: p, margin: 0 }}>
      <i style={{ width: 10, height: 10, background: C.fg }} />{children}
    </p>
  );
}
function Heading({ children, p, size = 76 }: { children: string; p: number; size?: number }) {
  return (
    <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.03em", color: C.fg, margin: "26px 0 0", whiteSpace: "pre-line",
      opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>{children}</h2>
  );
}

/* ---------- 4. Отсчёт ---------- */
function CountScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const t = TXT[lang];
  const n = Math.round(interpolate(f, [8, 60], [0, 238], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const ph = useSpring(6, { damping: 20, stiffness: 90 });
  const passed = 4;
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 160px", gap: 120 }}>
      <div style={{ flex: 1 }}>
        <Eyebrow p={lerp(f, 0, 14)}>{t.e1}</Eyebrow>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: 30 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 250, lineHeight: 0.8, letterSpacing: "-0.05em", color: C.fg, fontVariantNumeric: "tabular-nums" }}>{n}</span>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 36, color: C.fg2, paddingBottom: 6, maxWidth: 260, lineHeight: 1.15 }}>{t.days}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 26, marginTop: 40, width: 820 }}>
          {Array.from({ length: 40 }, (_, i) => {
            const s = lerp(f, 20 + i * 1.2, 30 + i * 1.2);
            return <i key={i} style={{ flex: 1, height: i === passed ? 26 : 9, transform: `scaleY(${s})`, transformOrigin: "bottom", background: i === passed ? C.fg : i < passed ? "#7a7a7a" : C.line2 }} />;
          })}
        </div>
        <Heading p={lerp(f, 40, 60)} size={60}>{t.h1}</Heading>
      </div>
      <Phone src={`screens/${lang}/home.webp`} style={{ transform: `translateY(${(1 - ph) * 700}px) rotate(${(1 - ph) * 8}deg)` }} />
    </AbsoluteFill>
  );
}

/* ---------- 5. Вариант от ИИ ---------- */
function ExamScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const t = TXT[lang];
  const ph = useSpring(4, { damping: 20, stiffness: 90 });
  const lines = t.log.filter((_, i) => f > 18 + i * 9);
  const scoreP = lerp(f, 92, 122);
  const got = Math.round(interpolate(f, [92, 118], [0, 3], clamp));
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 160px", gap: 120 }}>
      <Phone src={`screens/${lang}/variant.webp`} style={{ transform: `translateX(${(1 - ph) * -600}px) rotate(${(1 - ph) * -6}deg)` }} />
      <div style={{ flex: 1 }}>
        <Eyebrow p={lerp(f, 0, 14)}>{t.e2}</Eyebrow>
        <Heading p={lerp(f, 4, 24)}>{t.h2}</Heading>
        <div style={{ position: "relative", marginTop: 46, height: 6, background: C.line, overflow: "hidden", width: 760, opacity: f < 92 ? 1 : 1 - scoreP }}>
          <i style={{ position: "absolute", top: 0, bottom: 0, width: "30%", background: C.fg, left: `${((f * 2.2) % 130) - 30}%` }} />
        </div>
        <div style={{ position: "relative", height: 300, marginTop: 26 }}>
          <div style={{ fontFamily: MONO, fontSize: 28, lineHeight: 1.65, color: C.fg2, opacity: 1 - lerp(f, 84, 94) }}>
            {lines.map((l, i) => <div key={i}>{l}{i === lines.length - 1 && <span style={{ opacity: Math.floor(f / 8) % 2 ? 1 : 0.2 }}>▍</span>}</div>)}
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: scoreP, transform: `translateY(${(1 - scoreP) * 30}px)` }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 30 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 200, lineHeight: 0.8, letterSpacing: "-0.05em", color: C.fg }}>
                {got}<span style={{ fontSize: 80, color: C.fg3 }}>/5</span>
              </span>
              <span style={{ fontFamily: SANS, fontSize: 32, color: C.fg2, paddingBottom: 8 }}>{t.score}</span>
            </div>
            <div style={{ marginTop: 36, height: 10, width: 760, background: C.line, borderRadius: 4, overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", width: `${lerp(f, 100, 135) * 60}%`, background: C.fg }} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 6. Разбор ошибки в чате ---------- */
function ChatScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const t = TXT[lang];
  const q = useSpring(14, { damping: 16, stiffness: 150 });
  const typed = Math.floor(interpolate(f, [40, 112], [0, t.a.length], clamp));
  const ph = useSpring(4, { damping: 20, stiffness: 90 });
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 160px", gap: 120 }}>
      <div style={{ flex: 1 }}>
        <Eyebrow p={lerp(f, 0, 14)}>{t.e3}</Eyebrow>
        <Heading p={lerp(f, 4, 24)}>{t.h3}</Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 50, width: 900 }}>
          <div style={{ alignSelf: "flex-end", background: C.fg, color: C.bg, fontFamily: SANS, fontSize: 34, fontWeight: 500, padding: "20px 28px", borderRadius: "28px 28px 8px 28px",
            transform: `scale(${q})`, transformOrigin: "100% 100%", opacity: Math.min(1, q * 1.5) }}>{t.q}</div>
          <div style={{ alignSelf: "flex-start", maxWidth: 820, minHeight: 90, background: C.bg2, color: C.fg, fontFamily: SANS, fontSize: 31, lineHeight: 1.45, padding: "22px 28px", borderRadius: "28px 28px 28px 8px",
            opacity: lerp(f, 30, 40) }}>
            {typed === 0
              ? <span style={{ display: "inline-flex", gap: 10 }}>{[0, 1, 2].map(i => <i key={i} style={{ width: 12, height: 12, background: C.fg3, transform: `translateY(${Math.sin((f + i * 5) / 4) * 5}px)` }} />)}</span>
              : t.a.slice(0, typed)}
          </div>
        </div>
      </div>
      <Phone src={`screens/${lang}/chat.webp`} style={{ transform: `translateY(${(1 - ph) * 700}px) rotate(${(1 - ph) * 6}deg)` }} />
    </AbsoluteFill>
  );
}

/* ---------- 7. Компьютер и два языка ---------- */
function DeskScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const t = TXT[lang];
  const s = useSpring(0, { damping: 22, stiffness: 80 });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 66 }}>
      <div style={{ textAlign: "center" }}>
        <Eyebrow p={lerp(f, 0, 12)}><span style={{ margin: "0 auto" }}>{t.e4}</span></Eyebrow>
      </div>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, lineHeight: 1.08, letterSpacing: "-0.03em", color: C.fg, margin: "20px 0 0", textAlign: "center", whiteSpace: "pre-line", opacity: lerp(f, 2, 18) }}>{t.h4}</h2>
      <div style={{ perspective: 1800, marginTop: 44 }}>
        <div style={{ width: 1180, borderRadius: 18, overflow: "hidden", border: `2px solid ${C.line2}`, background: C.bg, boxShadow: "0 60px 140px rgba(0,0,0,.7)",
          transform: `rotateX(${(1 - s) * 28}deg) translateY(${(1 - s) * 260}px) scale(${0.9 + s * 0.1})`, transformOrigin: "50% 100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: C.bg2, borderBottom: `1px solid ${C.line}` }}>
            {[0, 1, 2].map(i => <i key={i} style={{ width: 13, height: 13, borderRadius: 9, background: C.line2 }} />)}
            <span style={{ margin: "0 auto", fontFamily: MONO, fontSize: 18, color: C.fg3, background: C.bg, padding: "5px 90px", borderRadius: 8 }}>{t.url.replace("/en", "")}/app</span>
          </div>
          <Img src={staticFile(`screens/${lang}/desktop-home.webp`)} style={{ display: "block", width: "100%", height: 450, objectFit: "cover", objectPosition: "top" }} />
        </div>
      </div>
      {t.keys.map((k, i) => {
        const p = useSpringLike(f, 26 + i * 8);
        const pos = [{ left: 200, top: 500 }, { right: 190, top: 400 }, { right: 250, top: 680 }][i];
        return (
          <div key={k} style={{ position: "absolute", ...pos, fontFamily: MONO, fontSize: 30, fontWeight: 600, color: C.bg, background: C.fg, padding: "14px 24px", borderRadius: 14,
            boxShadow: "0 20px 50px rgba(0,0,0,.5)", transform: `scale(${p}) rotate(${(i - 1) * 3}deg)`, opacity: Math.min(1, p * 1.5) }}>{k}</div>
        );
      })}
    </AbsoluteFill>
  );
}
function useSpringLike(f: number, delay: number) {
  return spring({ frame: f - delay, fps: FPS, config: { damping: 13, stiffness: 160, mass: 0.7 } });
}

/* ---------- 8. Финал ---------- */
function EndScene({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const t = TXT[lang];
  const ic = useSpring(0, { damping: 14, stiffness: 120 });
  const p = lerp(f, 14, 32), u = lerp(f, 24, 42);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Img src={staticFile("icon-512.png")} style={{ width: 210, height: 210, borderRadius: 48, boxShadow: `0 0 0 2px ${C.line2}, 0 40px 100px rgba(0,0,0,.6)`, transform: `scale(${ic}) rotate(${(1 - ic) * -12}deg)`, marginTop: -110 }} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 132, letterSpacing: "-0.03em", marginTop: 34, backgroundImage: `linear-gradient(${C.fg}, #8d8d8d)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        opacity: p, transform: `translateY(${(1 - p) * 26}px)` }}>HUNDO</div>
      <p style={{ fontFamily: SANS, fontSize: 38, fontWeight: 500, color: C.fg2, margin: "10px 0 0", opacity: p }}>{t.free}</p>
      <div style={{ marginTop: 34, fontFamily: MONO, fontSize: 34, fontWeight: 600, color: C.bg, background: C.fg, padding: "14px 30px", borderRadius: 999, opacity: u, transform: `translateY(${(1 - u) * 20}px)` }}>{t.url}</div>
    </AbsoluteFill>
  );
}

/* ---------- монтаж ---------- */
export function Promo({ lang }: { lang: Lang }) {
  useFonts();
  const f = useCurrentFrame();
  // книжки ярче на титрах в начале и в конце
  const books = interpolate(f, [0, 20, 190, 230, 790, 830], [0, 0.55, 0.55, 0.16, 0.16, 0.55], clamp);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #1b1b1b 0%, ${C.bg} 65%)` }} />
      <Books opacity={books} />
      <Scene range={S.icon}><IconScene lang={lang} /></Scene>
      <Scene range={S.word}><WordScene lang={lang} /></Scene>
      <Scene range={S.problem}><ProblemScene lang={lang} /></Scene>
      <Scene range={S.count}><CountScene lang={lang} /></Scene>
      <Scene range={S.exam}><ExamScene lang={lang} /></Scene>
      <Scene range={S.chat}><ChatScene lang={lang} /></Scene>
      <Scene range={S.desk}><DeskScene lang={lang} /></Scene>
      <Scene range={S.end} out={1}><EndScene lang={lang} /></Scene>
      <Chrome lang={lang} />
    </AbsoluteFill>
  );
}
