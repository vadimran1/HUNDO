import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Векторный логотип в «чертёжном» стиле: начало слова — сплошная заливка,
 * конец — пунктирный контур на сетке построения, с тремя маркерами
 * (как у кривой Безье в редакторе) и координатами якоря. Статичный.
 */
export function Wordmark({ text, className }: { text: string; className?: string }) {
  const u = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const [vb, setVb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [k, setK] = useState(1); // единиц SVG на экранный пиксель
  const step = 24;

  const measure = () => {
    const t = textRef.current;
    if (!t) return;
    let bb: DOMRect;
    try { bb = t.getBBox(); } catch { return; }
    if (!bb.width) return;
    setVb({ x: bb.x - 14, y: bb.y - 34, w: bb.width + 28, h: bb.height + 68 });
  };

  useLayoutEffect(measure, [text]);
  useEffect(() => { document.fonts?.ready.then(measure); }, [text]);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !vb) return;
    const upd = () => setK(vb.w / (el.getBoundingClientRect().width || 300));
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vb]);

  const v = vb || { x: 0, y: -200, w: 900, h: 300 };
  const cx = v.x + v.w * 0.8, cy = v.y + v.h * 0.5, R = v.h * 0.8;
  const ax = Math.round((v.x + v.w * 0.74) / step) * step, ay = Math.round((v.y + v.h * 0.3) / step) * step;
  const rig = [{ x: ax, y: ay }, { x: ax - 2 * step, y: ay - step }, { x: ax + 2 * step, y: ay + step }];
  const hs = 9 * k;
  const box = { x: v.x, y: v.y, width: v.w, height: v.h };

  return (
    <div className={cn("wm relative select-none", className)}>
      <svg ref={svgRef} viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} role="img" aria-label={text} style={{ opacity: vb ? 1 : 0 }}>
        <defs>
          <radialGradient id={`${u}g`}><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
          <radialGradient id={`${u}gi`}><stop offset="0" stopColor="#000" /><stop offset=".42" stopColor="#000" /><stop offset="1" stopColor="#fff" /></radialGradient>
          <linearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--fg)" }} /><stop offset="1" style={{ stopColor: "var(--wm-low)" }} /></linearGradient>
          <pattern id={`${u}p`} patternUnits="userSpaceOnUse" width={step} height={step}>
            <path className="wm-grid" d={`M${step} 0V${step}M0 ${step}H${step}`} fill="none" strokeWidth={0.8 * k} />
          </pattern>
          <mask id={`${u}mi`} maskUnits="userSpaceOnUse" {...box}><rect {...box} fill="#000" /><circle cx={cx} cy={cy} r={R} fill={`url(#${u}g)`} /></mask>
          <mask id={`${u}mo`} maskUnits="userSpaceOnUse" {...box}><rect {...box} fill="#fff" /><circle cx={cx} cy={cy} r={R} fill={`url(#${u}gi)`} /></mask>
        </defs>
        <rect {...box} fill={`url(#${u}p)`} mask={`url(#${u}mi)`} />
        <text ref={textRef} className="wm-solid" x="0" y="0" fontSize="200" fill={`url(#${u}f)`} mask={`url(#${u}mo)`}>{text}</text>
        <text className="wm-line" x="0" y="0" fontSize="200" mask={`url(#${u}mi)`} strokeWidth={1.3 * k} strokeDasharray={`${4 * k} ${3.2 * k}`}>{text}</text>
        {vb && (
          <g>
            {[1, 2].map(i => <line key={i} className="wm-l" x1={rig[0].x} y1={rig[0].y} x2={rig[i].x} y2={rig[i].y} strokeWidth={1.2 * k} />)}
            {[1, 2, 0].map(i => (
              <rect key={i} className={cn("wm-h", i === 0 && "a")} x={rig[i].x - hs / 2} y={rig[i].y - hs / 2} width={hs} height={hs} strokeWidth={1.5 * k} />
            ))}
            <text className="wm-ro" textAnchor="end" x={rig[1].x - 10 * k} y={rig[1].y + 4 * k} fontSize={10.5 * k} strokeWidth={4 * k}>
              {Math.round(ax - v.x)} · {Math.round(ay - v.y)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
