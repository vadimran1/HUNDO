import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, Sequence, random, spring, staticFile, useCurrentFrame } from "remotion";
import { interpolate } from "remotion";
import { Books, C, DISPLAY, MONO, Phone, SANS, clamp, useFonts } from "./Promo";

/*
 * Энергичный промо-ролик HUNDO под бит.
 * 150 ударов в минуту при 30 кадрах в секунду: одна доля = ровно 12 кадров, такт = 48.
 * Каждая склейка, слово и вспышка стоят точно на доле — музыка (hype_music.py) собрана по той же сетке.
 */
export const HYPE_FPS = 30;
export const B = 12;          // доля
export const BAR = 48;        // такт
export const HYPE_FRAMES = 20 * BAR; // 32 секунды

type Lang = "ru" | "en";

// Части ролика, в кадрах
const P = { intro: 0, build: 2 * BAR, drop1: 4 * BAR, count: 6 * BAR, exam: 8 * BAR, chat: 10 * BAR, brk: 12 * BAR, drop2: 14 * BAR, outro: 18 * BAR, end: 20 * BAR };

const T = {
  ru: {
    intro: ["ЕГЭ", "ОГЭ", "100", "БАЛЛОВ?"],
    build1: ["ТЕОРИЯ", "ЗАДАНИЯ", "ОШИБКИ", "ДЕДЛАЙН"],
    build2: ["ФИПИ", "БЛАНК", "ПРОБНИК", "СТРЕСС"],
    count3: ["3", "2", "1"],
    tagline: ["ИИ-РЕПЕТИТОР", "ДЛЯ ЕГЭ И ОГЭ", "БЕСПЛАТНО", "В ТЕЛЕФОНЕ"],
    e1: "01 · отсчёт", days: "дней до ЕГЭ",
    e2: "02 · вариант от ИИ", h2: "Вариант за минуту", score: "баллов",
    e3: "03 · разбор", h3: "Каждая ошибка — по шагам", q: "Почему 1703, а не 1700?",
    a: "16 мая 1703 года заложили Петропавловскую крепость — это дата основания Петербурга. 1700 — начало Северной войны.",
    e4: "04 · на компьютере", h4: "И на компьютере", keys: ["1–5", "Enter", "RU / EN"], langs: ["РУССКИЙ", "ENGLISH"],
    montage: ["ВАРИАНТЫ", "РАЗБОРЫ", "ПЛАН", "ПРОГРЕСС", "ТРЕНАЖЁР", "ЧАТ С ИИ", "ОФЛАЙН", "БЕЗ APP STORE"],
    free: "Бесплатно. Скачай на телефон.", url: "hundo.online", beat: "150 BPM",
  },
  en: {
    intro: ["EGE", "OGE", "100", "POINTS?"],
    build1: ["THEORY", "TASKS", "MISTAKES", "DEADLINE"],
    build2: ["FIPI", "ANSWER FORM", "MOCKS", "STRESS"],
    count3: ["3", "2", "1"],
    tagline: ["AI TUTOR", "FOR RUSSIAN EXAMS", "FREE", "ON YOUR PHONE"],
    e1: "01 · countdown", days: "days to the exam",
    e2: "02 · AI mock exam", h2: "A paper in a minute", score: "points",
    e3: "03 · explained", h3: "Every mistake, step by step", q: "Why 1703 and not 1700?",
    a: "The Peter and Paul Fortress was laid on 16 May 1703 — St Petersburg's founding date. 1700 is when the Great Northern War began.",
    e4: "04 · on desktop", h4: "On desktop too", keys: ["1–5", "Enter", "RU / EN"], langs: ["РУССКИЙ", "ENGLISH"],
    montage: ["MOCK EXAMS", "EXPLAINED", "STUDY PLAN", "PROGRESS", "PRACTICE", "AI CHAT", "OFFLINE", "NO APP STORE"],
    free: "Free. Get it on your phone.", url: "hundo.online/en", beat: "150 BPM",
  },
};

/* ---------- ритм ---------- */
/** 1 в момент доли, быстро гаснет к следующей */
const hit = (f: number, sharp = 2.4) => Math.exp(-(((f % B) + B) % B) / sharp);
/** «Энергия» части: сила тряски, пульса и вспышек */
function energy(f: number) {
  if (f < P.build) return 0.45;
  if (f < P.drop1) return interpolate(f, [P.build, P.drop1 - B], [0.5, 1.1], clamp) * (f >= P.drop1 - B ? 0 : 1);
  if (f < P.brk) return 1;
  if (f < P.drop2) return 0.25;
  if (f < P.outro) return 1.25;
  return Math.max(0.2, 1 - (f - P.outro) / 60);
}
/** Вспышка белым: на больших ударах сильная, на первой доле такта в дропах — лёгкая */
function flash(f: number) {
  for (const at of [P.drop1, P.drop2, P.outro]) if (f >= at && f < at + 12) return Math.exp(-(f - at) / 3.2);
  const inDrop = (f >= P.drop1 && f < P.brk) || (f >= P.drop2 && f < P.outro);
  if (inDrop && f % BAR < 6) return 0.35 * Math.exp(-(f % BAR) / 2);
  return 0;
}

/** Текст с RGB-сдвигом на ударе */
function rgb(amount: number): CSSProperties {
  const d = amount * 9;
  return d < 0.4 ? {} : { textShadow: `${-d}px 0 0 rgba(255,40,90,.9), ${d}px 0 0 rgba(40,230,255,.9)` };
}

/** Глитч: на сильной доле части кадра режутся полосами и сдвигаются */
function Glitch({ children, amount, seed }: { children: ReactNode; amount: number; seed: string }) {
  const f = useCurrentFrame();
  if (amount < 0.35) return <>{children}</>;
  const bands = [0, 1, 2].map(i => {
    const top = random(seed + f + "t" + i) * 85, h = 4 + random(seed + f + "h" + i) * 14;
    const dx = (random(seed + f + "x" + i) - 0.5) * 90 * amount;
    return { top, h, dx };
  });
  return (
    <>
      {children}
      {bands.map((b, i) => (
        <AbsoluteFill key={i} style={{ clipPath: `inset(${b.top}% 0 ${Math.max(0, 100 - b.top - b.h)}% 0)`, transform: `translateX(${b.dx}px)`, background: C.bg }}>
          {children}
        </AbsoluteFill>
      ))}
    </>
  );
}

/** Слово на весь экран, «вбивается» на долю. `at` — кадр появления внутри текущей Sequence */
function Slam({ text, at, size = 260, invert = false, sub, len = B }: { text: string; at: number; size?: number; invert?: boolean; sub?: string; len?: number }) {
  const f = useCurrentFrame();
  const t = f - at;
  // короткие слова (полдоли и меньше) влетают почти мгновенно, чтобы успеть прочитать
  const e = len <= 4 ? 1 : len <= 6 ? 2 : 3;
  const s = interpolate(t, [0, e, e * 2], [len <= 4 ? 1.5 : 2.3, 0.94, 1], clamp);
  const blur = interpolate(t, [0, e], [len <= 6 ? 10 : 24, 0], clamp);
  const fit = Math.min(size, 1650 / Math.max(1, text.length * 0.78));
  return (
    <AbsoluteFill style={{ background: invert ? C.fg : "transparent", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: fit, lineHeight: 0.9, letterSpacing: "-0.04em", color: invert ? C.bg : C.fg,
        transform: `scale(${s})`, filter: `blur(${blur}px)`, whiteSpace: "nowrap", ...(invert ? {} : rgb(hit(f) * 0.8)) }}>
        {text}
      </div>
      {sub && <div style={{ marginTop: 26, fontFamily: MONO, fontSize: 30, letterSpacing: "0.2em", color: invert ? C.bg : C.fg3, textTransform: "uppercase" }}>{sub}</div>}
    </AbsoluteFill>
  );
}

/** Последовательность слов: каждое держится `len` кадров */
function SlamSeq({ words, from, len, invertEvery = 0, size }: { words: string[]; from: number; len: number; invertEvery?: number; size?: number }) {
  return (
    <>
      {words.map((w, i) => (
        <Sequence key={i} from={from + i * len} durationInFrames={len} layout="none">
          <AbsoluteFill><Slam text={w} at={0} len={len} invert={invertEvery > 0 && i % invertEvery === invertEvery - 1} size={size} /></AbsoluteFill>
        </Sequence>
      ))}
    </>
  );
}

/* ---------- части ролика ---------- */
function Logo({ lang }: { lang: Lang }) {
  const f = useCurrentFrame() + P.drop1;
  const t = T[lang];
  const tag = t.tagline[Math.min(3, Math.floor((f - P.drop1) / (B * 2)))];
  const tagAt = P.drop1 + Math.floor((f - P.drop1) / (B * 2)) * B * 2;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 900, fontSize: 330, lineHeight: 1, letterSpacing: "-0.035em", marginTop: -70 }}>
        {"HUNDO".split("").map((ch, i) => {
          const k = hit(f);
          const jy = (random("j" + i + Math.floor(f / B)) - 0.5) * 40 * k;
          const s = spring({ frame: f - P.drop1 - i * 2, fps: HYPE_FPS, config: { damping: 11, stiffness: 220, mass: 0.6 } });
          return (
            <span key={i} style={{ display: "inline-block", color: C.fg, transform: `translateY(${(1 - s) * -400 + jy}px) scale(${0.5 + s * 0.5})`, ...rgb(k) }}>{ch}</span>
          );
        })}
      </div>
      <div key={tag} style={{ marginTop: 26, fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, letterSpacing: "0.02em", color: C.bg, background: C.fg, padding: "10px 28px 16px",
        transform: `scale(${interpolate(f - tagAt, [0, 4], [1.4, 1], clamp)})` }}>
        {tag}
      </div>
    </AbsoluteFill>
  );
}

function Count({ lang }: { lang: Lang }) {
  const f = useCurrentFrame() + P.count;
  const t = T[lang];
  const steps = [365, 330, 300, 280, 265, 250, 244, 238];
  const i = Math.min(steps.length - 1, Math.floor((f - P.count) / B));
  const ph = spring({ frame: f - P.count, fps: HYPE_FPS, config: { damping: 14, stiffness: 140 } });
  const k = hit(f);
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 150px", gap: 80 }}>
      <div style={{ flex: 1 }}>
        <Eyebrow>{t.e1}</Eyebrow>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 26, marginTop: 20 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 300, lineHeight: 0.8, letterSpacing: "-0.05em", color: C.fg, transform: `scale(${1 + 0.08 * k})`, transformOrigin: "left bottom", display: "inline-block", ...rgb(k) }}>{steps[i]}</span>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.fg2, paddingBottom: 8, maxWidth: 260, lineHeight: 1.1 }}>{t.days}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 30, marginTop: 44, width: 880 }}>
          {Array.from({ length: 40 }, (_, j) => {
            const lit = j < (i + 1) * 5;
            return <i key={j} style={{ flex: 1, height: j === (i + 1) * 5 - 1 ? 30 : 10, background: lit ? C.fg : C.line2 }} />;
          })}
        </div>
      </div>
      <Phone src={`screens/${lang}/home.webp`} style={{ scale: 0.9 + 0.02 * k, marginTop: -40, transform: `translateY(${(1 - ph) * 800}px) rotate(${(1 - ph) * 10 + Math.sin(f / 6) * 1.2}deg)` }} />
    </AbsoluteFill>
  );
}

function Exam({ lang }: { lang: Lang }) {
  const f = useCurrentFrame() + P.exam;
  const t = T[lang];
  const marks = ["✓", "✓", "✗", "✓", "✓"];
  const shown = Math.floor((f - P.exam) / B); // одна отметка на долю
  const scoreAt = P.exam + 6 * B;
  const ph = spring({ frame: f - P.exam, fps: HYPE_FPS, config: { damping: 14, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 150px", gap: 90 }}>
      <Phone src={`screens/${lang}/variant.webp`} style={{ scale: 0.9, marginTop: -40, transform: `translateX(${(1 - ph) * -900}px) rotate(${(1 - ph) * -10}deg)` }} />
      <div style={{ flex: 1 }}>
        <Eyebrow>{t.e2}</Eyebrow>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 92, letterSpacing: "-0.03em", lineHeight: 1, color: C.fg, margin: "22px 0 40px" }}>{t.h2}</h2>
        <div style={{ display: "flex", gap: 16 }}>
          {marks.map((m, j) => {
            const on = shown > j;
            const s = interpolate(f - (P.exam + (j + 1) * B), [0, 4], [1.6, 1], clamp);
            const bad = m === "✗";
            return (
              <div key={j} style={{ width: 120, height: 140, border: `3px solid ${on ? C.fg : C.line2}`, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: on ? (bad ? "transparent" : C.fg) : "transparent", color: bad ? C.fg : C.bg, transform: `scale(${on ? s : 1})`,
                backgroundImage: on && bad ? `repeating-linear-gradient(-45deg, ${C.bg2} 0 10px, ${C.bg} 10px 20px)` : undefined }}>
                <span style={{ fontFamily: MONO, fontSize: 24, opacity: on ? 0.7 : 0.4, color: on ? (bad ? C.fg3 : C.bg) : C.fg3 }}>{String(j + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 58, lineHeight: 1 }}>{on ? m : ""}</span>
              </div>
            );
          })}
        </div>
        {f >= scoreAt && (
          <div style={{ marginTop: 44, display: "flex", alignItems: "flex-end", gap: 22, transform: `scale(${interpolate(f - scoreAt, [0, 4], [1.8, 1], clamp)})`, transformOrigin: "left center" }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 190, lineHeight: 0.8, color: C.fg, ...rgb(hit(f)) }}>4<span style={{ fontSize: 80, color: C.fg3 }}>/5</span></span>
            <span style={{ fontFamily: SANS, fontSize: 38, color: C.fg2, paddingBottom: 10 }}>{t.score}</span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function Chat({ lang }: { lang: Lang }) {
  const f = useCurrentFrame() + P.chat;
  const t = T[lang];
  const q = interpolate(f - P.chat - 3, [0, 5], [0, 1], clamp);
  const words = t.a.split(" ");
  // ответ печатается кусками по полудолям
  const chunks = Math.max(0, Math.floor((f - P.chat - B) / (B / 2)));
  const shown = words.slice(0, Math.min(words.length, chunks * 2)).join(" ");
  const ph = spring({ frame: f - P.chat, fps: HYPE_FPS, config: { damping: 14, stiffness: 140 } });
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 150px", gap: 90 }}>
      <div style={{ flex: 1 }}>
        <Eyebrow>{t.e3}</Eyebrow>
        <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 80, letterSpacing: "-0.03em", lineHeight: 1.02, color: C.fg, margin: "22px 0 44px" }}>{t.h3}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 940 }}>
          <div style={{ alignSelf: "flex-end", background: C.fg, color: C.bg, fontFamily: SANS, fontWeight: 600, fontSize: 38, padding: "20px 30px", borderRadius: "30px 30px 8px 30px",
            transform: `scale(${0.6 + q * 0.4})`, opacity: q, transformOrigin: "100% 100%" }}>{t.q}</div>
          <div style={{ alignSelf: "flex-start", background: C.bg2, color: C.fg, fontFamily: SANS, fontSize: 33, lineHeight: 1.42, padding: "22px 30px", borderRadius: "30px 30px 30px 8px", minHeight: 100, maxWidth: 900,
            opacity: f >= P.chat + B ? 1 : 0, border: `2px solid ${hit(f) > 0.6 ? C.fg3 : C.line2}` }}>
            {shown || "…"}
          </div>
        </div>
      </div>
      <Phone src={`screens/${lang}/chat.webp`} style={{ scale: 0.9, marginTop: -40, transform: `translateY(${(1 - ph) * 800}px) rotate(${(1 - ph) * 8}deg)` }} />
    </AbsoluteFill>
  );
}

function Desk({ lang }: { lang: Lang }) {
  const f = useCurrentFrame() + P.brk;
  const t = T[lang];
  const s = spring({ frame: f - P.brk, fps: HYPE_FPS, config: { damping: 20, stiffness: 70 } });
  const second = f >= P.brk + BAR; // второй такт брейка — разгон к дропу
  const roll = second ? Math.floor((f - P.brk - BAR) / (f - P.brk - BAR < 24 ? 6 : 3)) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
      <p style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: C.fg3, textTransform: "uppercase", margin: 0 }}>{t.e4}</p>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, letterSpacing: "-0.03em", color: C.fg, margin: "14px 0 0" }}>
        {second ? <span style={{ ...rgb(0.6) }}>{t.langs[roll % 2]}</span> : t.h4}
      </h2>
      <div style={{ perspective: 1800, marginTop: 40 }}>
        <div style={{ width: 1200, borderRadius: 18, overflow: "hidden", border: `2px solid ${C.line2}`, background: C.bg, boxShadow: "0 60px 140px rgba(0,0,0,.7)",
          transform: `rotateX(${(1 - s) * 35}deg) translateY(${(1 - s) * 300}px) scale(${0.88 + s * 0.12 + (second ? 0.03 * hit(f, 1.5) : 0)})`, transformOrigin: "50% 100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: C.bg2, borderBottom: `1px solid ${C.line}` }}>
            {[0, 1, 2].map(i => <i key={i} style={{ width: 13, height: 13, borderRadius: 9, background: C.line2 }} />)}
            <span style={{ margin: "0 auto", fontFamily: MONO, fontSize: 18, color: C.fg3, background: C.bg, padding: "5px 90px", borderRadius: 8 }}>hundo.online/app</span>
          </div>
          <Img src={staticFile(`screens/${lang}/desktop-${second && roll % 2 ? "variant" : "home"}.webp`)} style={{ display: "block", width: "100%", height: 470, objectFit: "cover", objectPosition: "top" }} />
        </div>
      </div>
      {t.keys.map((k, i) => {
        const at = P.brk + (i + 1) * B;
        const p = spring({ frame: f - at, fps: HYPE_FPS, config: { damping: 11, stiffness: 200, mass: 0.6 } });
        const pos = [{ left: 190, top: 520 }, { right: 180, top: 420 }, { right: 240, top: 720 }][i];
        return (
          <div key={k} style={{ position: "absolute", ...pos, fontFamily: MONO, fontSize: 36, fontWeight: 700, color: C.bg, background: C.fg, padding: "14px 26px", borderRadius: 14,
            transform: `scale(${p}) rotate(${(i - 1) * 4}deg)`, boxShadow: "0 20px 50px rgba(0,0,0,.5)" }}>{k}</div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Второй дроп: склейка на каждую долю — слово / экран / слово / экран */
function Montage({ lang }: { lang: Lang }) {
  const f = useCurrentFrame() + P.drop2;
  const t = T[lang];
  const i = Math.floor((f - P.drop2) / B);
  const local = (f - P.drop2) % B;
  const screens = ["variant", "desktop-home", "chat", "desktop-stats", "train", "desktop-variant", "home", "desktop-chat"];
  if (i % 2 === 0) {
    const w = t.montage[(i / 2) % t.montage.length];
    return <Slam text={w} at={i * B} invert={i % 4 === 2} size={230} />;
  }
  const scr = screens[((i - 1) / 2) % screens.length];
  const desk = scr.startsWith("desktop");
  const z = interpolate(local, [0, B], [1.18, 1.0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${z}) rotate(${(i % 3 - 1) * 2}deg)` }}>
      {desk ? (
        <div style={{ width: 1500, borderRadius: 16, overflow: "hidden", border: `2px solid ${C.line2}`, boxShadow: "0 60px 140px rgba(0,0,0,.7)" }}>
          <Img src={staticFile(`screens/${lang}/${scr}.webp`)} style={{ display: "block", width: "100%", height: 860, objectFit: "cover", objectPosition: "top" }} />
        </div>
      ) : (
        <Phone src={`screens/${lang}/${scr}.webp`} style={{ scale: 1.15, marginTop: 0 }} />
      )}
    </AbsoluteFill>
  );
}

function Outro({ lang }: { lang: Lang }) {
  const f = useCurrentFrame() + P.outro;
  const t = T[lang];
  const ic = spring({ frame: f - P.outro, fps: HYPE_FPS, config: { damping: 10, stiffness: 180, mass: 0.7 } });
  const p = interpolate(f - P.outro - B, [0, 6], [0, 1], clamp);
  const u = interpolate(f - P.outro - 2 * B, [0, 6], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Img src={staticFile("icon-512.png")} style={{ width: 230, height: 230, borderRadius: 52, boxShadow: `0 0 0 2px ${C.line2}, 0 40px 100px rgba(0,0,0,.6)`, transform: `scale(${ic}) rotate(${(1 - ic) * -25}deg)`, marginTop: -120 }} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, letterSpacing: "-0.03em", marginTop: 26, color: C.fg, opacity: p, transform: `scale(${0.8 + p * 0.2})`, ...rgb(hit(f) * 0.5) }}>HUNDO</div>
      <p style={{ fontFamily: SANS, fontSize: 42, fontWeight: 600, color: C.fg2, margin: "6px 0 0", opacity: p }}>{t.free}</p>
      <div style={{ marginTop: 34, fontFamily: MONO, fontSize: 38, fontWeight: 700, color: C.bg, background: C.fg, padding: "14px 34px", borderRadius: 999, opacity: u, transform: `translateY(${(1 - u) * 24}px)` }}>{t.url}</div>
    </AbsoluteFill>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 26, letterSpacing: "0.16em", textTransform: "uppercase", color: C.fg3, margin: 0 }}>
      <i style={{ width: 12, height: 12, background: C.fg }} />{children}
    </p>
  );
}

/** Рамка: метроном-полоса внизу, «150 BPM», мигающий квадрат на долю */
function Hud({ lang }: { lang: Lang }) {
  const f = useCurrentFrame();
  const k = hit(f);
  const beatInBar = Math.floor((f % BAR) / B);
  const passed = Math.floor((f / HYPE_FRAMES) * 40);
  const off = f >= P.drop1 - B && f < P.drop1; // пауза перед дропом — рамка гаснет
  return (
    <AbsoluteFill style={{ opacity: off ? 0 : 1 }}>
      <div style={{ position: "absolute", left: 70, top: 56, display: "flex", alignItems: "center", gap: 12, fontFamily: DISPLAY, fontWeight: 900, fontSize: 22, letterSpacing: "0.08em", color: C.fg }}>
        <i style={{ width: 14, height: 14, background: C.fg, transform: `scale(${1 + k * 0.8})` }} />HUNDO
      </div>
      <div style={{ position: "absolute", right: 70, top: 56, display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: C.fg3 }}>
        {[0, 1, 2, 3].map(i => <i key={i} style={{ width: 12, height: 12, background: i === beatInBar ? C.fg : C.line2 }} />)}
        <span style={{ marginLeft: 6 }}>{T[lang].beat}</span>
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 50, display: "flex", alignItems: "flex-end", gap: 6, height: 18 }}>
        {Array.from({ length: 40 }, (_, i) => (
          <i key={i} style={{ flex: 1, height: i === passed ? 18 : 6, background: i === passed ? C.fg : i < passed ? "#7a7a7a" : C.line2 }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- монтаж ---------- */
function Part({ from, to, children }: { from: number; to: number; children: ReactNode }) {
  return <Sequence from={from} durationInFrames={to - from}>{children}</Sequence>;
}

export function Hype({ lang }: { lang: Lang }) {
  useFonts();
  const f = useCurrentFrame();
  const t = T[lang];
  const e = energy(f);
  const k = hit(f);
  const shakeX = (random("sx" + f) - 0.5) * 22 * k * e, shakeY = (random("sy" + f) - 0.5) * 16 * k * e;
  const zoom = 1 + 0.03 * k * e;
  const fl = flash(f);
  const books = interpolate(f, [0, 10, P.build, P.drop1, P.drop1 + 20, P.count, P.outro, P.outro + 10], [0, 0.4, 0.4, 0.6, 0.6, 0.12, 0.12, 0.6], clamp);
  const silence = f >= P.drop1 - B && f < P.drop1;
  const stripes = (f >= P.drop1 && f < P.brk) || (f >= P.drop2 && f < P.outro);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #1d1d1d 0%, ${C.bg} 62%)` }} />
      {stripes && <AbsoluteFill style={{ opacity: 0.05 + 0.05 * k, backgroundImage: `repeating-linear-gradient(-45deg, ${C.fg} 0 2px, transparent 2px 46px)`, backgroundPosition: `${f * 6}px 0` }} />}
      {!silence && <Books opacity={books} />}

      <AbsoluteFill style={{ transform: `translate(${shakeX}px, ${shakeY}px) scale(${zoom})` }}>
        <Glitch amount={f >= P.drop1 && f < P.brk || f >= P.drop2 && f < P.outro ? (f % BAR < 3 ? 1 : 0) : 0} seed="g">
          {/* интро: слово на каждую долю */}
          <SlamSeq words={t.intro} from={P.intro} len={B * 2} invertEvery={4} />
          {/* разгон: по доле, потом по полдоли, потом отсчёт */}
          <SlamSeq words={t.build1} from={P.build} len={B} />
          <SlamSeq words={t.build2} from={P.build + 4 * B} len={B / 2} invertEvery={2} />
          <SlamSeq words={t.count3} from={P.build + 6 * B} len={B / 3} size={460} />
          <Part from={P.drop1} to={P.count}><Logo lang={lang} /></Part>
          <Part from={P.count} to={P.exam}><Count lang={lang} /></Part>
          <Part from={P.exam} to={P.chat}><Exam lang={lang} /></Part>
          <Part from={P.chat} to={P.brk}><Chat lang={lang} /></Part>
          <Part from={P.brk} to={P.drop2}><Desk lang={lang} /></Part>
          <Part from={P.drop2} to={P.outro}><Montage lang={lang} /></Part>
          <Part from={P.outro} to={P.end}><Outro lang={lang} /></Part>
        </Glitch>
      </AbsoluteFill>

      {/* пауза перед первым дропом: тонкая линия расходится от центра */}
      {silence && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "#000" }}>
          <i style={{ height: 3, width: `${interpolate(f, [P.drop1 - B, P.drop1], [0, 100], clamp)}%`, background: C.fg }} />
        </AbsoluteFill>
      )}
      <Hud lang={lang} />
      {fl > 0.01 && <AbsoluteFill style={{ background: "#fff", opacity: fl, mixBlendMode: "screen" }} />}
      <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.12, backgroundImage: "radial-gradient(ellipse at center, transparent 55%, #000 100%)" }} />
    </AbsoluteFill>
  );
}

