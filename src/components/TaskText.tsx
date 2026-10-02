import { cn } from "@/lib/utils";

/** Похоже ли на код: отступы, print(, range(, присваивания в несколько строк */
const isCode = (block: string) => {
  const lines = block.split("\n");
  return lines.some(l => /^( {2,}|\t)\S/.test(l)) || /\bprint\(|\brange\(|^\s*(def|for|while|if)\b.*:\s*$/m.test(block);
};

/**
 * Текст задания: абзацы и списки вариантов сохраняют переносы строк,
 * а программы (например, на Python) показываются моноширинным блоком с отступами.
 */
export function TaskText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={cn("grid gap-3", className)}>
      {blocks.map((b, i) => isCode(b)
        ? <pre key={i} className="overflow-x-auto rounded-xl bg-bg-2 px-4 py-3.5 font-mono text-[14.5px] leading-[1.6] font-normal tracking-normal lg:text-[16px]">{b}</pre>
        : <p key={i} className="m-0 whitespace-pre-line">{b}</p>)}
    </div>
  );
}
