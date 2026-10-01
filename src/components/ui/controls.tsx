import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { L } from "@/lib/i18n";

/** Чип-переключатель */
export function Chip({ pressed, className, ...props }: React.ComponentProps<"button"> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "rounded-full border px-[13px] py-2 text-[13.5px] font-semibold transition-colors duration-200 active:scale-95",
        pressed ? "border-fg bg-fg text-bg" : "border-line-2 bg-bg text-fg-2 hover:border-fg-3",
        className,
      )}
      {...props}
    />
  );
}

/** Сегментированный переключатель: подложка переезжает к выбранному пункту (layout-анимация Motion) */
export function Segmented<T extends string>({ items, value, onChange, id }: {
  items: [T, string][]; value: T; onChange: (v: T, el: HTMLButtonElement) => void; id: string;
}) {
  return (
    <div className="flex rounded-[10px] border border-line bg-bg-2 p-[3px]">
      {items.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          onClick={e => onChange(v, e.currentTarget)}
          className={cn("relative flex-1 rounded-[7px] px-1.5 py-[9px] text-[13.5px] font-semibold transition-colors", v === value ? "text-fg" : "text-fg-3")}
        >
          {v === value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-[7px] bg-bg shadow-[0_1px_2px_rgba(0,0,0,.08),0_0_0_1px_var(--line)]"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Переключатель вкл/выкл */
export function Switch({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={cn("relative h-6 w-10 flex-none rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent",
        checked ? "border-accent bg-accent" : "border-line-2 bg-bg-3")}>
        <motion.span
          className={cn("absolute top-[2px] left-[2px] size-[18px] rounded-full", checked ? "bg-on-accent" : "bg-fg")}
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
        />
      </span>
      <span className="text-[13px]">{children}</span>
    </label>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("mb-2 block text-[13px] font-medium text-fg-3", className)}>{children}</span>;
}

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-[30px] mb-3 flex items-center gap-2.5 font-mono text-[12px] font-medium tracking-[.12em] text-fg-3 uppercase after:h-px after:flex-1 after:bg-line">
      {children}
    </div>
  );
}

export function Verdict({ kind, title, children }: { kind: "ok" | "bad" | "part"; title: string; children?: React.ReactNode }) {
  const icon = kind === "ok"
    ? <path d="m5 12.5 4.5 4.5L19 7.5" />
    : kind === "part" ? <path d="M6 12h12" /> : <path d="M17 7 7 17M7 7l10 10" />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("verdict mt-3.5 flex items-start gap-3 rounded-xl border px-4 py-3.5",
        kind === "ok" ? "border-accent" : "hatch border-line-2")}
    >
      <span data-vi className={cn("grid size-[26px] flex-none place-items-center rounded-[7px]",
        kind === "ok" ? "bg-accent text-on-accent" : kind === "bad" ? "bg-fg text-bg" : "border-[1.5px] border-fg")}>
        <svg viewBox="0 0 24 24" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <div className="min-w-0">
        <b className="block text-[15px]">{title}</b>
        {children && <span className="text-[13px] text-fg-2">{children}</span>}
      </div>
    </motion.div>
  );
}

export function Typing() {
  return <span className="typing" aria-label={L("ИИ печатает", "AI is typing")}><i /><i /><i /></span>;
}
