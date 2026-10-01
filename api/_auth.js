// Общая часть входа через мессенджеры (Telegram, MAX).
// Как работает вход:
//   1) приложение просит /api/auth {action:"start"} — сервер создаёт одноразовый код (nonce) на 10 минут;
//   2) ученик открывает бота по ссылке t.me/<бот>?start=<код> или max.ru/<бот>?start=<код>;
//   3) бот получает код вместе с id пользователя мессенджера и привязывает их друг к другу;
//   4) приложение каждые 2 секунды спрашивает /api/auth {action:"poll"} и получает токен сессии.
// Пароли не нужны: мессенджер сам подтверждает, что это тот же человек.
import crypto from "node:crypto";
import { redis } from "./_redis.js";

export const APP_URL = (process.env.APP_URL || "https://www.hundo.online").replace(/\/+$/, "");
export const NONCE_TTL = 600;
export const SESSION_TTL = 180 * 24 * 3600;

export const env = n => process.env[n] || "";
export const MAX_API = (env("MAX_API_BASE") || "https://platform-api.max.ru").replace(/\/+$/, "");
export const rand = (bytes = 16) => crypto.randomBytes(bytes).toString("hex");
/** Секрет для вебхуков выводится из токена бота: хранить отдельно не нужно, снаружи не угадать */
export const hookSecret = (name, token) => crypto.createHash("sha256").update(`hundo:${name}:${token}`).digest("hex").slice(0, 48);
export const validNonce = n => typeof n === "string" && /^[a-f0-9]{32}$/.test(n);

export const PROVIDERS = {
  tg: {
    title: "Telegram",
    token: () => env("TELEGRAM_BOT_TOKEN"),
    bot: () => env("TELEGRAM_BOT_NAME").replace(/^@/, "").replace(/^https?:\/\/t\.me\//, ""),
    link: (bot, nonce) => `https://t.me/${bot}?start=${nonce}`,
  },
  max: {
    title: "MAX",
    token: () => env("MAX_BOT_TOKEN"),
    bot: () => env("MAX_BOT_NAME").replace(/^@/, "").replace(/^https?:\/\/max\.ru\//, ""),
    link: (bot, nonce) => `https://max.ru/${bot}?start=${nonce}`,
  },
};
export const enabled = p => Boolean(PROVIDERS[p]?.token() && PROVIDERS[p]?.bot());

/**
 * Вызывается ботом, когда пользователь пришёл по ссылке с кодом.
 * Возвращает "ok" | "expired" | "used" и язык, на котором отвечать.
 */
export async function linkNonce(nonce, provider, person){
  if(!validNonce(nonce)) return {result:"expired", lang:"ru"};
  const raw = await redis("GET", "auth:n:" + nonce);
  if(!raw) return {result:"expired", lang:"ru"};
  const rec = JSON.parse(raw);
  const lang = rec.lang === "en" ? "en" : "ru";
  if(rec.s !== "pending" || rec.p !== provider) return {result:"used", lang};
  const uid = `${provider}:${person.id}`;
  const prev = JSON.parse((await redis("GET", "user:" + uid)) || "null");
  const profile = {
    uid, provider,
    name: String(person.name || "").slice(0, 80) || (provider === "tg" ? "Telegram" : "MAX"),
    username: person.username ? String(person.username).slice(0, 64) : "",
    created: prev?.created || Date.now(),
  };
  await redis("SET", "user:" + uid, JSON.stringify(profile));
  await redis("SET", "auth:n:" + nonce, JSON.stringify({...rec, s:"ok", uid}), "EX", NONCE_TTL);
  return {result:"ok", lang, profile};
}

export const BOT_TEXT = {
  ok: {
    ru: "Готово, вы вошли в HUNDO ✅\nВернитесь в приложение — прогресс теперь сохраняется в аккаунте и доступен на любом устройстве.",
    en: "Done, you're signed in to HUNDO ✅\nGo back to the app — your progress is now saved to your account and available on any device.",
  },
  expired: {
    ru: "Ссылка для входа устарела. Откройте HUNDO и нажмите «Войти» ещё раз.",
    en: "This sign-in link has expired. Open HUNDO and tap “Sign in” again.",
  },
  used: {
    ru: "Эта ссылка уже использована. Если нужно войти ещё раз, нажмите «Войти» в приложении.",
    en: "This link has already been used. To sign in again, tap “Sign in” in the app.",
  },
  hello: {
    ru: "Привет! Это бот для входа в HUNDO — ИИ-репетитор для ЕГЭ и ОГЭ.\nЧтобы войти, откройте приложение → Настройки → Аккаунт → «Войти».",
    en: "Hi! This is the sign-in bot for HUNDO, an AI tutor for the Russian state exams.\nTo sign in, open the app → Settings → Account → “Sign in”.",
  },
  button: {ru: "Открыть HUNDO", en: "Open HUNDO"},
};

/** Достаёт uid по токену сессии из заголовка Authorization: Bearer … */
export async function sessionUser(req){
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if(!/^[a-f0-9]{64}$/.test(token)) return null;
  const uid = await redis("GET", "sess:" + token);
  return uid ? {uid, token} : null;
}
