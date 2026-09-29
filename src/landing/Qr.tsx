import { useMemo } from "react";
import qrcode from "qrcode-generator";

/** QR-код ссылки в SVG, цвета из темы */
export function Qr({ value, className }: { value: string; className?: string }) {
  const { n, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n, path: d };
  }, [value]);
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className={className} role="img" aria-label={`QR-код: ${value}`} shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="var(--bg)" />
      <path d={path} fill="var(--fg)" />
    </svg>
  );
}
