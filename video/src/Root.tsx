import { Composition } from "remotion";
import { Promo, PROMO_FRAMES, FPS } from "./Promo";

// Промо-ролик HUNDO: 30 секунд, 1920×1080, русская и английская версии.
// Предпросмотр: npx remotion studio   ·   рендер: node render.mjs
export const Root = () => (
  <>
    <Composition id="promo-ru" component={Promo} durationInFrames={PROMO_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "ru" as const }} />
    <Composition id="promo-en" component={Promo} durationInFrames={PROMO_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "en" as const }} />
  </>
);
