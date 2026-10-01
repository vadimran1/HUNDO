import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, RefreshCw } from "lucide-react";
import { useT, useLang } from "@/lib/i18n";
import { useDesktop } from "../Shell";
import {
  useAccount, authConfig, startLogin, pollLogin, pullAndMerge, pushNow, logout,
  PROVIDER_NAME, type AuthConfig, type Provider,
} from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Section, Typing, Verdict } from "@/components/ui/controls";
import { Qr } from "@/landing/Qr";
import { burst } from "@/lib/fx";
import { cn } from "@/lib/utils";

/** Значки мессенджеров — простые геометрические, без чужих логотипов */
function Mark({ p, className }: { p: Provider; className?: string }) {
  return p === "tg"
    ? <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M21.5 4.2 2.9 11.4c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.4c.2.7 1.1.9 1.6.4l2.6-2.4 4.6 3.4c.6.4 1.4.1 1.6-.6L22.9 5.6c.2-1-.6-1.8-1.4-1.4Zm-3.8 3.6-7.9 7.1-.3 3-1.2-3.7 9.4-6.4Z" /></svg>
    : <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18V7l8 7 8-7v11" /></svg>;
}

type Wait = { provider: Provider; nonce: string; url: string; until: number };

/** Блок в настройках: кто вошёл или кнопка «Войти» */
export function AccountRow({ onOpen }: { onOpen: () => void }) {
  const user = useAccount(s => s.user);
  const status = useAccount(s => s.status);
  const t = useT();
  return (
    <button onClick={onOpen} className="group flex w-full items-center gap-3.5 rounded-[14px] border border-line px-4 py-3.5 text-left hover:border-fg">
      <span className={cn("grid size-10 flex-none place-items-center rounded-full", user ? "bg-accent text-on-accent" : "bg-bg-2 text-fg-2")}>
        {user ? <b className="font-display text-[16px]">{user.name.slice(0, 1).toUpperCase()}</b> : <Mark p="tg" className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px]">{user ? user.name : t("Войти через Telegram или MAX", "Sign in with Telegram or MAX")}</b>
        <span className="text-[12.5px] text-fg-3">
          {user
            ? `${PROVIDER_NAME[user.provider]} · ${status === "error" || status === "offline" ? t("не сохранено, повторю позже", "not saved yet, will retry") : t("прогресс сохраняется в аккаунте", "progress is saved to your account")}`
            : t("прогресс на всех устройствах, пароль не нужен", "your progress on every device, no password")}
        </span>
      </span>
      <ArrowUpRight className="size-[18px] text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
    </button>
  );
}

export function AccountSheet() {
  const { token, user, status, synced } = useAccount();
  const [cfg, setCfg] = useState<AuthConfig | null | undefined>(undefined);
  const [wait, setWait] = useState<Wait | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<Provider | null>(null);
  const [justIn, setJustIn] = useState(false);
  const okRef = useRef<HTMLDivElement>(null);
  const lang = useLang(s => s.lang);
  const desktop = useDesktop();
  const t = useT();

  useEffect(() => { authConfig().then(setCfg); }, []);

  // ждём, пока ученик нажмёт «Старт» в боте: спрашиваем сервер раз в 2 секунды
  useEffect(() => {
    if (!wait) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      if (Date.now() > wait.until) { setWait(null); setErr(t("Ссылка устарела. Нажмите «Войти» ещё раз.", "The link expired. Tap “Sign in” again.")); return; }
      try {
        const r = await pollLogin(wait.nonce);
        if (stop) return;
        if (r.status === "ok" && r.token && r.user) {
          useAccount.setState({ token: r.token, user: r.user, synced: 0, status: "saving" });
          setWait(null); setJustIn(true);
          setTimeout(() => burst(okRef.current?.querySelector("[data-vi]") || null), 60);
          await pullAndMerge();
          return;
        }
        if (r.status === "expired") { setWait(null); setErr(t("Ссылка устарела. Нажмите «Войти» ещё раз.", "The link expired. Tap “Sign in” again.")); return; }
      } catch { /* сеть моргнула — попробуем ещё раз */ }
      setTimeout(tick, 2000);
    };
    const id = setTimeout(tick, 1500);
    // вернулись из мессенджера — проверяем сразу, не дожидаясь таймера
    const vis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { stop = true; clearTimeout(id); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wait]);

  const begin = async (p: Provider) => {
    setErr(""); setBusy(p);
    try {
      const r = await startLogin(p, lang);
      setWait({ provider: p, nonce: r.nonce, url: r.url, until: Date.now() + r.ttl * 1000 - 5000 });
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(null); }
  };

  /* ---- вошёл ---- */
  if (token && user) return (
    <div className="pb-2">
      <div ref={okRef}>
        {justIn && <Verdict kind="ok" title={t("Вы вошли", "You're signed in")}>{t("Прогресс с этого устройства объединён с аккаунтом.", "Progress from this device has been merged with your account.")}</Verdict>}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <span className="grid size-14 flex-none place-items-center rounded-full bg-accent font-display text-[22px] font-bold text-on-accent">{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0">
          <b className="block truncate text-[18px]">{user.name}</b>
          <span className="flex items-center gap-1.5 text-[13px] text-fg-3"><Mark p={user.provider} className="size-3.5" />{PROVIDER_NAME[user.provider]}{user.username ? ` · @${user.username}` : ""}</span>
        </span>
      </div>

      <Section>{t("Синхронизация", "Sync")}</Section>
      <p className="flex items-center gap-2 text-[13.5px] text-fg-2">
        {status === "saving" ? <><Typing /> {t("Сохраняю…", "Saving…")}</>
          : status === "error" ? t("Не получилось сохранить. Попробую снова, когда вы вернётесь в приложение.", "Couldn't save. I'll retry when you come back to the app.")
          : status === "offline" ? t("Нет интернета — сохраню, когда связь появится.", "You're offline — I'll save once you're back online.")
          : <><Check className="size-4 text-accent" /> {synced ? t(`Сохранено ${new Date(synced).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`, `Saved ${new Date(synced).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`) : t("Готово к сохранению", "Ready to save")}</>}
      </p>
      <p className="mt-2 text-[12.5px] leading-snug text-fg-3">
        {t("В аккаунте хранятся статистика, карточки, диагностика, вариант и переписка с ИИ. Ключ ИИ и напоминания остаются только на этом устройстве. Войдите тем же мессенджером на другом телефоне или компьютере — прогресс подтянется сам.",
          "Your account keeps your stats, flashcards, diagnostic, mock exam and AI chat. The AI key and reminders stay on this device only. Sign in with the same messenger on another phone or computer and your progress follows.")}
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => pullAndMerge().then(pushNow)} disabled={status === "saving"}><RefreshCw className="size-4" /> {t("Синхронизировать", "Sync now")}</Button>
        <Button variant="ghost" onClick={() => { setJustIn(false); logout(); }}>{t("Выйти", "Sign out")}</Button>
      </div>
      <p className="mt-2 text-[12px] text-fg-3">{t("После выхода прогресс останется на этом устройстве.", "After signing out your progress stays on this device.")}</p>
    </div>
  );

  /* ---- ждём подтверждения в мессенджере ---- */
  if (wait) return (
    <div className="pb-2">
      <h3 className="mb-2 font-display text-[22px] font-bold tracking-[-.01em]">{t(`Подтвердите вход в ${PROVIDER_NAME[wait.provider]}`, `Confirm in ${PROVIDER_NAME[wait.provider]}`)}</h3>
      <ol className="mb-5 grid gap-1.5 text-[14px] text-fg-2">
        <li>1. {desktop ? t("Наведите камеру телефона на код или нажмите кнопку ниже", "Scan the code with your phone or press the button below") : t("Нажмите кнопку ниже — откроется бот", "Tap the button below — the bot will open")}</li>
        <li>2. {t("В боте нажмите «Старт» (или «Начать»)", "In the bot press “Start”")}</li>
        <li>3. {t("Вернитесь сюда — вход произойдёт сам", "Come back here — you'll be signed in automatically")}</li>
      </ol>
      {desktop && (
        <div className="mb-4 w-[200px] rounded-2xl border border-line p-3"><Qr value={wait.url} className="block w-full" /></div>
      )}
      <a href={wait.url} target="_blank" rel="noopener"
        className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-accent text-[15.5px] font-semibold text-on-accent active:scale-[.98]">
        <Mark p={wait.provider} className="size-5" /> {t(`Открыть ${PROVIDER_NAME[wait.provider]}`, `Open ${PROVIDER_NAME[wait.provider]}`)}
      </a>
      <p className="mt-4 flex items-center gap-2.5 text-[13px] text-fg-3"><Typing /> {t("Жду подтверждения от бота…", "Waiting for the bot…")}</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setWait(null)}>{t("Отмена", "Cancel")}</Button>
    </div>
  );

  /* ---- не вошёл ---- */
  const prov = (p: Provider) => cfg?.providers?.[p];
  return (
    <div className="pb-2">
      <p className="text-[14.5px] text-fg-2">
        {t("Войдите через мессенджер — прогресс будет сохраняться в аккаунте и откроется на любом телефоне или компьютере. Пароль и почта не нужны: бот просто подтвердит, что это вы.",
          "Sign in with a messenger and your progress is saved to your account and opens on any phone or computer. No password or email — the bot simply confirms it's you.")}
      </p>
      <div className="mt-5 grid gap-2.5">
        {(["tg", "max"] as Provider[]).map(p => {
          const on = !!prov(p)?.on && !!cfg?.db;
          return (
            <motion.button key={p} whileTap={on ? { scale: 0.98 } : undefined} disabled={!on || !!busy} onClick={() => begin(p)}
              className={cn("flex items-center gap-3.5 rounded-[14px] border px-4 py-4 text-left transition-colors",
                on ? "border-fg hover:bg-bg-2" : "border-line-2 opacity-55")}>
              <span className={cn("grid size-10 flex-none place-items-center rounded-full", on ? "bg-fg text-bg" : "bg-bg-2 text-fg-3")}><Mark p={p} className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <b className="block text-[15.5px]">{t(`Войти через ${PROVIDER_NAME[p]}`, `Sign in with ${PROVIDER_NAME[p]}`)}</b>
                <span className="text-[12.5px] text-fg-3">
                  {cfg === undefined ? t("проверяю…", "checking…")
                    : on ? `@${prov(p)!.bot}`
                    : !cfg?.db ? t("сервер аккаунтов не настроен", "account server isn't set up")
                    : t("скоро", "coming soon")}
                </span>
              </span>
              {busy === p && <Typing />}
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {err && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="hatch mt-3 rounded-xl border border-line-2 px-4 py-3 text-[13.5px]">{err}</motion.div>}
      </AnimatePresence>
      <p className="mt-4 text-[12.5px] leading-snug text-fg-3">
        {t("Без входа всё работает как раньше — данные хранятся только на этом устройстве. Сервер знает лишь имя из мессенджера и ваш прогресс.",
          "Everything works without signing in — data then stays on this device only. The server only knows your messenger name and your progress.")}
      </p>
    </div>
  );
}
