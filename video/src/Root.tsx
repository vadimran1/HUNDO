import { Composition } from "remotion";
import { Promo, PROMO_FRAMES, FPS } from "./Promo";
import { Hype, HYPE_FRAMES, HYPE_FPS } from "./Hype";

// Промо-ролики HUNDO, 1920×1080, русская и английская версии: спокойный (promo) и энергичный под бит (hype).
// Предпросмотр: npx remotion studio   ·   рендер: node render.mjs
export const Root = () => (
  <>
    <Composition id="promo-ru" component={Promo} durationInFrames={PROMO_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "ru" as const }} />
    <Composition id="promo-en" component={Promo} durationInFrames={PROMO_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "en" as const }} />
    {/* энергичная версия под бит: 150 BPM, 32 секунды */}
    <Composition id="hype-ru" component={Hype} durationInFrames={HYPE_FRAMES} fps={HYPE_FPS} width={1920} height={1080} defaultProps={{ lang: "ru" as const }} />
    <Composition id="hype-en" component={Hype} durationInFrames={HYPE_FRAMES} fps={HYPE_FPS} width={1920} height={1080} defaultProps={{ lang: "en" as const }} />
  </>
);
