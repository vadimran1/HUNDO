import { motion } from "motion/react";
import { useLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** RU / EN — переключатель языка */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang(s => s.lang);
  const setLang = useLang(s => s.setLang);
  return (
    <div role="group" aria-label="Language" className={cn("inline-flex rounded-lg border border-line p-[2px] font-mono text-[11.5px] font-semibold tracking-[.06em]", className)}>
      {(["ru", "en"] as Lang[]).map(l => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
          className={cn("relative rounded-md px-2 py-1 uppercase transition-colors", lang === l ? "text-bg" : "text-fg-3 hover:text-fg")}>
          {lang === l && <motion.span layoutId={"lang-" + (className || "")} className="absolute inset-0 rounded-md bg-fg" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  );
}

