// Рендер промо-роликов HUNDO.
//   node render.mjs video ru,en hype   — энергичный ролик под бит → ../public/promo/hundo-hype-ru.mp4, -en.mp4
//   node render.mjs video ru,en promo  — спокойный ролик        → ../public/promo/hundo-ru.mp4, -en.mp4
//   node render.mjs stills ru hype 100,200 — контрольные кадры в ./out/
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const here = path.dirname(new URL(import.meta.url).pathname);
const browserExecutable = process.env.CHROME || (fs.existsSync("/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell")
  ? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" : undefined);
// скриншоты и шрифты берём из самого приложения, чтобы ролик всегда показывал актуальный интерфейс
const root = path.join(here, "..");
fs.cpSync(path.join(root, "public/screens"), path.join(here, "public/screens"), { recursive: true });
fs.copyFileSync(path.join(root, "public/icons/icon-512.png"), path.join(here, "public/icon-512.png"));
fs.mkdirSync(path.join(here, "public/fonts"), { recursive: true });
for (const f of ["unbounded", "onest", "jetbrains-mono"]) for (const sub of ["latin", "cyrillic"]) {
  const name = `${f}-${sub}-wght-normal.woff2`;
  fs.copyFileSync(path.join(root, `node_modules/@fontsource-variable/${f}/files/${name}`), path.join(here, "public/fonts", name));
}
const serveUrl = await bundle({ entryPoint: path.join(here, "src/index.ts"), publicDir: path.join(here, "public") });
const out = path.join(here, "..", "public", "promo");
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(here, "out"), { recursive: true });

const mode = process.argv[2] || "video";
const langs = (process.argv[3] || "ru,en").split(",");
const kind = process.argv[4] || "hype";
const name = (lang) => kind === "hype" ? `hundo-hype-${lang}` : `hundo-${lang}`;
for (const lang of langs) {
  const composition = await selectComposition({ serveUrl, id: `${kind}-${lang}`, browserExecutable });
  if (mode === "stills") {
    const frames = (process.argv[5] || "30,120,175,200,330,430,530,620,700,760,880").split(",").map(Number);
    for (const frame of frames) {
      await renderStill({ composition, serveUrl, frame, output: path.join(here, "out", `${kind}-${lang}-${frame}.png`), browserExecutable });
    }
  } else {
    await renderMedia({
      composition, serveUrl, codec: "h264", crf: 20, pixelFormat: "yuv420p", browserExecutable,
      outputLocation: path.join(out, `${name(lang)}.mp4`), concurrency: 2,
      onProgress: ({ progress }) => { if (Math.round(progress * 100) % 20 === 0) process.stdout.write(`${lang} ${Math.round(progress * 100)}%  `); },
    });
    // звук: hype.wav из hype_music.py или music.wav из music.py, громкость выравнивается до −14 LUFS
    const music = path.join(here, "public", kind === "hype" ? "hype.wav" : "music.wav");
    if (fs.existsSync(music)) {
      const v = path.join(out, `${name(lang)}.mp4`), tmp = path.join(out, `tmp-${lang}.mp4`);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", v, "-i", music, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
        "-af", kind === "hype" ? "loudnorm=I=-14:TP=-1.2:LRA=7" : "loudnorm=I=-15:TP=-1.5:LRA=9", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-shortest", "-movflags", "+faststart", tmp]);
      fs.renameSync(tmp, v);
    }
    // обложка для плеера на сайте — кадр с логотипом
    await renderStill({ composition, serveUrl, frame: kind === "hype" ? 230 : 170, output: path.join(out, `poster-${kind === "hype" ? "hype-" : ""}${lang}.png`), browserExecutable });
  }
}
console.log("\nготово");
