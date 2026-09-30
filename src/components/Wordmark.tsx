import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Логотип: название жирным шрифтом, растягивается на всю ширину блока */
export function Wordmark({ text, className }: { text: string; className?: string }) {
  const textRef = useRef<SVGTextElement>(null);
  const [vb, setVb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const measure = () => {
    const t = textRef.current;
    if (!t) return;
    let bb: DOMRect;
    try { bb = t.getBBox(); } catch { return; }
    if (!bb.width) return;
    setVb({ x: bb.x - 4, y: bb.y - 4, w: bb.width + 8, h: bb.height + 8 });
  };
  useLayoutEffect(measure, [text]);
  useEffect(() => { document.fonts?.ready.then(measure); }, [text]);

  const v = vb || { x: 0, y: -200, w: 900, h: 260 };
  return (
    <div className={cn("wm relative select-none", className)}>
      <svg viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} role="img" aria-label={text} style={{ opacity: vb ? 1 : 0 }}>
        <text ref={textRef} className="wm-solid" x="0" y="0" fontSize="200" fill="var(--fg)" stroke="var(--bg)" strokeWidth="14" paintOrder="stroke" strokeLinejoin="round">{text}</text>
      </svg>
    </div>
  );
}
