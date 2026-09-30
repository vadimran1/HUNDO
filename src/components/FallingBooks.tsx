import { useEffect, useRef } from "react";
import { cn, prefersReducedMotion } from "@/lib/utils";

/**
 * Падающие чёрно-белые книжки на canvas.
 * Закрытые книжки кувыркаются, раскрытые машут страницами. Цвета — из темы.
 * При «уменьшить движение» книжки просто лежат на месте.
 */
type Book = {
  x: number; y: number; s: number;          // позиция и размер (ширина обложки)
  vy: number; sway: number; phase: number;  // скорость падения, амплитуда покачивания, фаза
  rot: number; vr: number;                  // поворот и скорость вращения
  open: boolean; filled: boolean;           // раскрытая? залитая или контурная?
};

export function FallingBooks({ className, density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now(), frame = 0;
    let fg = "#111", bg = "#fafafa";
    const still = prefersReducedMotion();
    let books: Book[] = [];

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      fg = cs.getPropertyValue("--fg").trim() || fg;
      bg = cs.getPropertyValue("--bg").trim() || bg;
    };
    const spawn = (anywhere: boolean): Book => {
      const s = 9 + Math.random() * 11;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -30 - Math.random() * 60,
        s,
        vy: 22 + Math.random() * 38 + s * 1.2,
        sway: 6 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 1.6,
        open: Math.random() < 0.35,
        filled: Math.random() < 0.55,
      };
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const target = Math.round((w * h) / 11000 * density);
      while (books.length < target) books.push(spawn(true));
      books.length = Math.min(books.length, target);
      if (still) draw(0);
    };

    // закрытая книжка: обложка, корешок, две строчки названия
    const closed = (b: Book) => {
      const bw = b.s, bh = b.s * 1.35;
      ctx.fillStyle = b.filled ? fg : bg;
      ctx.strokeStyle = fg; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 1.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = b.filled ? bg : fg;
      ctx.fillRect(-bw / 2 + bw * 0.14, -bh / 2, Math.max(1, bw * 0.08), bh);            // корешок
      ctx.fillRect(-bw / 2 + bw * 0.34, -bh * 0.22, bw * 0.46, Math.max(1, bh * 0.05));  // строчка
      ctx.fillRect(-bw / 2 + bw * 0.34, -bh * 0.08, bw * 0.3, Math.max(1, bh * 0.05));
    };
    // раскрытая книжка: две половинки «домиком», страницы машут
    const open = (b: Book, t: number) => {
      const half = b.s * 0.75, bh = b.s * 1.1;
      const flap = 0.35 + 0.35 * (1 + Math.sin(t * 7 + b.phase)) / 2;   // угол раскрытия
      ctx.strokeStyle = fg; ctx.lineWidth = 1.2; ctx.fillStyle = b.filled ? fg : bg;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.transform(1, -flap * 0.6, 0, 1, 0, 0);
        ctx.beginPath(); ctx.rect(0, -bh / 2, half, bh); ctx.fill(); ctx.stroke();
        ctx.fillStyle = b.filled ? bg : fg;
        for (let i = 0; i < 3; i++) ctx.fillRect(half * 0.2, -bh * 0.28 + i * bh * 0.2, half * 0.6, Math.max(0.8, bh * 0.04));
        ctx.restore();
        ctx.fillStyle = b.filled ? fg : bg;
      }
    };

    function draw(t: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);
      for (const b of books) {
        ctx!.save();
        ctx!.translate(b.x + Math.sin(t * 0.9 + b.phase) * b.sway, b.y);
        ctx!.rotate(b.open ? Math.sin(t * 1.3 + b.phase) * 0.4 : b.rot);
        if (b.open) open(b, t); else closed(b);
        ctx!.restore();
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (++frame % 60 === 0) readColors();
      for (let i = 0; i < books.length; i++) {
        const b = books[i];
        b.y += b.vy * dt * (b.open ? 0.6 : 1);   // раскрытые «планируют» медленнее
        b.rot += b.vr * dt;
        if (b.y > h + 40) books[i] = spawn(false);
      }
      draw(now / 1000);
      raf = requestAnimationFrame(tick);
    };

    readColors();
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    const mo = new MutationObserver(() => { readColors(); if (still) draw(0); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
    if (!still) raf = requestAnimationFrame(t => { last = t; tick(t); });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
