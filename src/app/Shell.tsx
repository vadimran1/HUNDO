import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Home, Rows3, FileText, MessageSquare, BarChart3, SlidersHorizontal, X } from "lucide-react";
import { useApp, useUI, type Tab } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "home", label: "Главная", Icon: Home },
  { id: "train", label: "Тренажёр", Icon: Rows3 },
  { id: "variant", label: "Варианты", Icon: FileText },
  { id: "chat", label: "ИИ", Icon: MessageSquare },
  { id: "stats", label: "Прогресс", Icon: BarChart3 },
];

export function TopBar() {
  const exam = useApp(s => s.exam);
  const openSheet = useUI(s => s.openSheet);
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[560px] items-center gap-2.5 px-4 py-2.5">
        <p className="m-0 flex items-center gap-2 font-display text-[15px] font-black tracking-[.06em]">
          <i className="inline-block size-2 bg-accent transition-colors duration-500" />HUNDO
        </p>
        <span className="rounded border border-line-2 px-1.5 py-0.5 font-mono text-[10.5px] tracking-[.08em] text-fg-3">{exam}</span>
        <span className="flex-1" />
        <Button variant="outline" size="icon" aria-label="Настройки" onClick={() => openSheet("settings")} className="size-[38px] border-line text-fg-2">
          <SlidersHorizontal className="size-[18px]" />
        </Button>
      </div>
    </header>
  );
}

export function TabBar() {
  const tab = useUI(s => s.tab);
  const go = useUI(s => s.go);
  return (
    <nav aria-label="Разделы" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md">
      <div className="mx-auto grid max-w-[560px] grid-cols-5">
        {TABS.map(({ id, label, Icon }) => {
          const on = id === tab;
          return (
            <button key={id} role="tab" aria-selected={on} onClick={() => go(id)}
              className={cn("relative flex flex-col items-center gap-1 px-0.5 pt-2.5 pb-[11px] text-[10.5px] font-semibold transition-colors", on ? "text-fg" : "text-fg-3")}>
              {on && <motion.span layoutId="tab-ind" className="absolute -top-px h-0.5 w-[26px] bg-accent" transition={{ type: "spring", stiffness: 520, damping: 34 }} />}
              <motion.span animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }} whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                <Icon className="size-[21px]" strokeWidth={1.8} />
              </motion.span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Экраны сменяются со сдвигом в сторону выбранной вкладки */
export function ScreenTransition({ id, children }: { id: string; children: ReactNode }) {
  const dir = useUI(s => s.dir);
  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={id}
        custom={dir}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: d * 32 }),
          center: { opacity: 1, x: 0 },
          exit: (d: number) => ({ opacity: 0, x: d * -24 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Шторка снизу. Закрывается крестиком, тапом по фону, Esc или смахиванием вниз */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-60 bg-black/45" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            key="sheet" role="dialog" aria-modal="true" aria-label={title}
            className="fixed inset-x-0 bottom-0 z-61 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[22px] border-t border-line-2 bg-bg pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}
          >
            <div className="mx-auto max-w-[560px] px-4">
              <div className="sticky top-0 z-2 flex items-center gap-2.5 bg-bg pt-2.5 pb-3 touch-none" onPointerDown={e => drag.start(e)}>
                <span className="absolute top-1.5 left-1/2 h-1 w-[38px] -translate-x-1/2 rounded-full bg-line-2" />
                <h2 className="mt-3.5 flex-1 font-display text-lg font-bold tracking-[-.01em]">{title}</h2>
                <Button variant="outline" size="icon" aria-label="Закрыть" onClick={onClose} className="mt-3.5 size-[38px] border-line">
                  <X className="size-[18px]" />
                </Button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Обновления: на Vercel каждый push собирает новую версию. Браузер замечает новый
 * service worker, и здесь появляется плашка с текстом коммита и кнопкой «Обновить».
 */
export function UpdateToast() {
  const [note, setNote] = useState("Нажмите, чтобы обновить приложение");
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => reg.update().catch(() => {});
      setInterval(check, 20 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    },
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!needRefresh) return;
    fetch("/version.json", { cache: "no-store" }).then(r => (r.ok ? r.json() : null))
      .then(v => { if (v?.message) setNote(v.message); }).catch(() => {});
  }, [needRefresh]);

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div role="status"
          initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-70 mx-auto flex max-w-[536px] items-center gap-3 rounded-[14px] bg-fg py-3 pr-3 pl-4 text-bg shadow-[0_10px_30px_rgba(0,0,0,.25)]">
          <div className="min-w-0 flex-1">
            <b className="block text-sm">Вышла новая версия</b>
            <span className="block truncate text-[12.5px] opacity-70">{note}</span>
          </div>
          <Button size="sm" disabled={busy} onClick={() => { setBusy(true); updateServiceWorker(true); }}
            className="bg-bg text-fg [:root[data-accent]_&]:bg-accent [:root[data-accent]_&]:text-on-accent">
            {busy ? "Обновляю…" : "Обновить"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
