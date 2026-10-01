// Рендер промо-ролика HUNDO.
//   node render.mjs            — оба ролика (ru, en) в ../public/promo/
//   node render.mjs stills     — контрольные кадры в ./out/
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
for (const lang of langs) {
  const composition = await selectComposition({ serveUrl, id: `promo-${lang}`, browserExecutable });
  if (mode === "stills") {
    const frames = (process.argv[4] || "60,150,290,400,540,700,790,880").split(",").map(Number);
    for (const frame of frames) {
      await renderStill({ composition, serveUrl, frame, output: path.join(here, "out", `${lang}-${frame}.png`), browserExecutable });
    }
  } else {
    await renderMedia({
      composition, serveUrl, codec: "h264", crf: 20, pixelFormat: "yuv420p", browserExecutable,
      outputLocation: path.join(out, `hundo-${lang}.mp4`), concurrency: 2,
      onProgress: ({ progress }) => { if (Math.round(progress * 100) % 20 === 0) process.stdout.write(`${lang} ${Math.round(progress * 100)}%  `); },
    });
    // звук: музыка из music.py, громкость выравнивается до −15 LUFS
    const music = path.join(here, "public", "music.wav");
    if (fs.existsSync(music)) {
      const v = path.join(out, `hundo-${lang}.mp4`), tmp = path.join(out, `tmp-${lang}.mp4`);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", v, "-i", music, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
        "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-shortest", "-movflags", "+faststart", tmp]);
      fs.renameSync(tmp, v);
    }
    // обложка для плеера на сайте — кадр с логотипом
    await renderStill({ composition, serveUrl, frame: 170, output: path.join(out, `poster-${lang}.png`), browserExecutable });
  }
}
console.log("\nготово");
