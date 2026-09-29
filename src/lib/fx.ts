import { animate } from "motion";
import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./utils";

/** Разлёт квадратиков-маркеров из элемента — при верном ответе */
export function burst(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 14; i++) {
    const b = document.createElement("i");
    b.style.cssText = `position:fixed;left:${cx - 4}px;top:${cy - 4}px;width:8px;height:8px;z-index:100;pointer-events:none;border:1.5px solid var(--accent);background:${i % 3 ? "var(--bg)" : "var(--accent)"}`;
    document.body.appendChild(b);
    const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.4, dist = 60 + Math.random() * 80;
    animate(b, {
      x: [0, Math.cos(ang) * dist], y: [0, Math.sin(ang) * dist - 24],
      rotate: [0, Math.random() * 180], scale: [1, 0.4], opacity: [1, 0],
    }, { duration: 0.75 + Math.random() * 0.3, ease: [0.2, 0.8, 0.2, 1] }).then(() => b.remove());
  }
}

/** Встряхнуть элемент — при ошибке */
export function shake(el: Element | null) {
  if (!el || prefersReducedMotion()) return;
  animate(el, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.42 });
}

/** Смена темы или цвета: новый вид проявляется кругом от точки нажатия */
export function reveal(x: number, y: number, update: () => void) {
  const root = document.documentElement;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
  if (prefersReducedMotion() || !doc.startViewTransition) { update(); return; }
  root.dataset.vt = "reveal";
  const t = doc.startViewTransition(() => flushSync(update));
  t.ready.then(() => {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" });
  }).catch(() => {});
  t.finished.finally(() => { delete root.dataset.vt; });
}

/** Применить тему и акцент к <html> */
export function applyLook(theme: string, accent: string) {
  const root = document.documentElement;
  if (theme) root.setAttribute("data-theme", theme); else root.removeAttribute("data-theme");
  if (accent && accent !== "mono") root.setAttribute("data-accent", accent); else root.removeAttribute("data-accent");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim() || "#0a0a0a");
}
