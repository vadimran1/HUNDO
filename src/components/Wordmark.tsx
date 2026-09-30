import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Логотип: название жирным шрифтом с мягким градиентом сверху вниз, растягивается на всю ширину блока */
export function Wordmark({ text, className }: { text: string; className?: string }) {
  const u = useId().replace(/:/g, "");
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
        <defs>
          <linearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--fg)" }} />
            <stop offset="1" style={{ stopColor: "var(--wm-low)" }} />
          </linearGradient>
        </defs>
        <text ref={textRef} className="wm-solid" x="0" y="0" fontSize="200" fill={`url(#${u}f)`}>{text}</text>
      </svg>
    </div>
  );
}
