/**
 * Аккаунт через Telegram / MAX и синхронизация прогресса между устройствами.
 * Без входа всё работает как раньше — данные только на этом устройстве.
 * После входа прогресс (статистика, карточки, диагностика, вариант, чат) хранится на сервере,
 * а ключ ИИ и настройки уведомлений остаются только на устройстве.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useApp } from "./store";

export type Provider = "tg" | "max";
export type User = { name: string; username?: string; provider: Provider };
export type AuthConfig = { db: boolean; providers: Record<Provider, { on: boolean; bot: string }> };

type Acc = {
  token: string; user: User | null;
  /** когда сервер последний раз сохранял данные, которые есть на этом устройстве */
  synced: number;
  status: "idle" | "saving" | "saved" | "error" | "offline";
};

export const useAccount = create<Acc>()(persist((): Acc => ({ token: "", user: null, synced: 0, status: "idle" }), {
  name: "hundo-account", version: 1,
  partialize: ({ token, user, synced }) => ({ token, user, synced }),
}));

export const PROVIDER_NAME: Record<Provider, string> = { tg: "Telegram", max: "MAX" };

async function call<T = any>(body: object): Promise<T> {
  const token = useAccount.getState().token;
  const r = await fetch("/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && j.relogin) { useAccount.setState({ token: "", user: null, synced: 0 }); }
  if (!r.ok) throw Object.assign(new Error(j.error || "Ошибка " + r.status), { status: r.status });
  return j;
}

export async function authConfig(): Promise<AuthConfig | null> {
  try { const r = await fetch("/api/auth"); return r.ok ? await r.json() : null; } catch { return null; }
}
export const startLogin = (provider: Provider, lang: string) => call<{ nonce: string; url: string; ttl: number }>({ action: "start", provider, lang });
export const pollLogin = (nonce: string) => call<{ status: "pending" | "expired" | "ok"; token?: string; user?: User; updated?: number }>({ action: "poll", nonce });

/* ---------- что синхронизируем ---------- */
type AppState = ReturnType<typeof useApp.getState>;
const SKIP = new Set(["settings", "remind", "patch", "touchStreak", "record", "addWeak", "resetStats"]);

/** Снимок прогресса для сервера: без ключа ИИ, без фото в чате, последние 60 сообщений */
export function snapshot(s: AppState = useApp.getState()) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (!SKIP.has(k) && typeof v !== "function") out[k] = v;
  out.chat = s.chat.slice(-60).map(({ image: _, ...m }) => m);
  return out;
}

/**
 * Сливает прогресс с двух устройств, ничего не теряя:
 * статистика — где решено больше, ответы и слабые темы — объединяем,
 * карточки — более продвинутое состояние, вариант и диагностика — более свежие.
 * Настройки экзамена берём с той стороны, где данные новее.
 */
export function merge(local: AppState, remote: Partial<AppState>, remoteNewer: boolean): Partial<AppState> {
  const r = remote;
  const stats = { ...local.stats };
  for (const [k, v] of Object.entries(r.stats || {})) if (!stats[k] || v.done > stats[k].done) stats[k] = v;
  const cards = { ...local.cards };
  for (const [k, v] of Object.entries(r.cards || {})) {
    const l = cards[k];
    if (!l || v.box > l.box || (v.box === l.box && v.due > l.due)) cards[k] = v;
  }
  const weakAI = [...local.weakAI];
  for (const w of r.weakAI || []) if (!weakAI.some(x => x.subj === w.subj && x.topic === w.topic)) weakAI.push(w);
  const streak = !r.streak ? local.streak : (r.streak.last > local.streak.last || (r.streak.last === local.streak.last && r.streak.days > local.streak.days)) ? r.streak : local.streak;
  const diag = !r.diag ? local.diag : !local.diag || r.diag.date >= local.diag.date ? r.diag : local.diag;
  const variant = !r.variant ? local.variant : !local.variant || r.variant.created >= local.variant.created ? r.variant : local.variant;
  const chat = (r.chat?.length || 0) > local.chat.length ? r.chat! : local.chat;
  const base = remoteNewer || !local.onboarded
    ? { exam: r.exam ?? local.exam, subjects: r.subjects ?? local.subjects, examDate: r.examDate ?? local.examDate, theme: r.theme ?? local.theme, accent: r.accent ?? local.accent }
    : {};
  return {
    ...base, onboarded: local.onboarded || !!r.onboarded,
    stats, answered: { ...(r.answered || {}), ...local.answered }, cards, weakAI, streak, diag, variant, chat,
  };
}

/* ---------- сохранение и загрузка ---------- */
let applying = false;
let timer: ReturnType<typeof setTimeout> | undefined;

export async function pushNow() {
  const { token } = useAccount.getState();
  if (!token) return;
  clearTimeout(timer);
  useAccount.setState({ status: "saving" });
  try {
    const { updated } = await call<{ updated: number }>({ action: "save", state: snapshot() });
    useAccount.setState({ synced: updated, status: "saved" });
  } catch (e) {
    useAccount.setState({ status: navigator.onLine ? "error" : "offline" });
  }
}

/** Забрать прогресс с сервера и слить с локальным; потом отправить общий результат обратно */
export async function pullAndMerge() {
  const { token, synced } = useAccount.getState();
  if (!token) return;
  try {
    const { state, updated } = await call<{ state: Partial<AppState> | null; updated: number }>({ action: "load" });
    if (state && updated !== synced) {
      applying = true;
      useApp.setState(merge(useApp.getState(), state, updated > synced));
      applying = false;
    }
    await pushNow();
  } catch { useAccount.setState({ status: navigator.onLine ? "error" : "offline" }); }
}

export async function logout() {
  try { await call({ action: "logout" }); } catch { /* сессия и так недействительна */ }
  useAccount.setState({ token: "", user: null, synced: 0, status: "idle" });
}

/** Подписка: любое изменение прогресса уходит на сервер через 3 секунды тишины */
let started = false;
export function startSync() {
  if (started) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (applying || !useAccount.getState().token) return;
    // смена ключа ИИ или уведомлений не синхронизируется — не дёргаем сервер
    const changed = (Object.keys(s) as (keyof AppState)[]).some(k => !SKIP.has(k) && s[k] !== prev[k]);
    if (!changed) return;
    clearTimeout(timer);
    timer = setTimeout(pushNow, 3000);
  });
  const onShow = () => { if (document.visibilityState === "visible") pullAndMerge(); else if (timer) pushNow(); };
  document.addEventListener("visibilitychange", onShow);
  addEventListener("online", () => pullAndMerge());
  if (useAccount.getState().token) pullAndMerge();
}
