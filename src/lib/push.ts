/**
 * Напоминания «ты 2 дня не занимался» через Web Push.
 * Сервер знает только случайный номер устройства и адрес подписки браузера — ни имени, ни почты.
 * На iPhone push работает только у приложения, установленного на главный экран (iOS 16.4+).
 */
const ID_KEY = "hundo-id";
const SEEN_KEY = "hundo-seen";

export function deviceId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id || !/^[a-z0-9]{12,40}$/.test(id)) {
      const a = new Uint8Array(12); crypto.getRandomValues(a);
      id = Array.from(a, b => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch { return "anon" + Math.random().toString(36).slice(2, 16); }
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export type PushFail = "ios-install" | "unsupported" | "server" | "denied" | "error";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function post(body: object) {
  const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true });
  if (!r.ok) throw new Error("push " + r.status);
}

export async function enableRemind(lang: string): Promise<{ ok: true } | { ok: false; reason: PushFail }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return { ok: false, reason: isIOS() && !standalone() ? "ios-install" : "unsupported" };
  if (isIOS() && !standalone()) return { ok: false, reason: "ios-install" };
  let key = "";
  try {
    const info = await fetch("/api/push", { cache: "no-store" }).then(r => r.json());
    if (!info?.enabled || !info.publicKey) return { ok: false, reason: "server" };
    key = info.publicKey;
  } catch { return { ok: false, reason: "server" }; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("no sw")), 8000)),
    ]);
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    await post({ action: "subscribe", id: deviceId(), sub: sub.toJSON(), lang });
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString().slice(0, 10)); } catch { /* ignore */ }
    return { ok: true };
  } catch { return { ok: false, reason: "error" }; }
}

export async function disableRemind() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch { /* ignore */ }
  try { await post({ action: "unsubscribe", id: deviceId() }); } catch { /* ignore */ }
}

/** Раз в день сообщаем серверу «ученик заходил» — тогда напоминание не придёт */
export function pingSeen() {
  try {
    const d = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(SEEN_KEY) === d) return;
    post({ action: "seen", id: deviceId() }).then(() => localStorage.setItem(SEEN_KEY, d)).catch(() => {});
  } catch { /* ignore */ }
}
