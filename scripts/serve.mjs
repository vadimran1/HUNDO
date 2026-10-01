// Сервер HUNDO без Vercel: отдаёт папку dist и запускает функции из api/.
// Подходит и для проверки на своём компьютере, и для хостинга в России (Amvera, VPS и т. п.),
// где адреса Vercel бывают недоступны без VPN.
//   npm run build
//   OPENROUTER_API_KEY=ваш_ключ node scripts/serve.mjs   →  http://localhost:3000
// Переменные: PORT (по умолчанию 3000), CANONICAL_HOST — например www.hundo.online:
// запросы на другие адреса этого сервера (hundo.online без www) перенаправляются туда.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(root, "dist");
const PORT = Number(process.env.PORT || 3000);
const CANONICAL = (process.env.CANONICAL_HOST || "").trim();
// все функции из папки api/: /api/chat → api/chat.js, /api/push → api/push.js …
const API = {};
for (const f of fs.readdirSync(path.join(root, "api"))) {
  if (f.endsWith(".js") && !f.startsWith("_")) API[f.slice(0, -3)] = (await import("../api/" + f)).default;
}
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp4": "video/mp4" };
const ZIP = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".txt", ".xml"]);

// те же заголовки, что в vercel.json
function cacheFor(rel) {
  if (/^\/(sw\.js|version\.json)$/.test(rel)) return "no-cache, no-store, must-revalidate";
  if (rel === "/push-sw.js") return "no-cache";
  if (rel.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (rel.startsWith("/promo/") || rel.startsWith("/screens/") || rel.startsWith("/icons/")) return "public, max-age=86400";
  if (rel.endsWith(".html")) return "no-cache";
  return "public, max-age=3600";
}

http.createServer(async (req, res) => {
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const proto = req.headers["x-forwarded-proto"] || "http";
    const url = new URL(req.url, `${proto}://${host}`);
    if (CANONICAL && url.hostname !== CANONICAL && url.hostname !== "localhost" && !url.pathname.startsWith("/api/")) {
      res.writeHead(308, { location: `https://${CANONICAL}${url.pathname}${url.search}` });
      return res.end();
    }
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "strict-origin-when-cross-origin");

    const fn = url.pathname.startsWith("/api/") && API[url.pathname.slice(5)];
    if (fn) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      headers.set("host", url.host);
      const ctrl = new AbortController();
      res.on("close", () => { if (!res.writableEnded) ctrl.abort(); });
      const r = await fn.fetch(new Request(url, { method: req.method, headers, signal: ctrl.signal, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      if (r.body) for await (const chunk of r.body) res.write(chunk);
      return res.end();
    }

    const p = url.pathname === "/app" ? "/app/" : /^\/en\/?$/.test(url.pathname) ? "/" : url.pathname; // как rewrites в vercel.json
    let file = path.join(DIST, decodeURIComponent(p));
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("Не найдено"); }
    const rel = "/" + path.relative(DIST, file).split(path.sep).join("/");
    const ext = path.extname(file);
    const size = fs.statSync(file).size;
    const h = { "content-type": TYPES[ext] || "application/octet-stream", "cache-control": cacheFor(rel), "accept-ranges": "bytes" };
    if (rel === "/sw.js") h["service-worker-allowed"] = "/";

    // видео: Safari на iPhone просит файл кусками (Range) — без этого ролик не играет
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range) {
      let start = range[1] ? Number(range[1]) : size - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : size - 1;
      if (!range[1]) end = size - 1;
      if (start >= size || start < 0 || end < start) { res.writeHead(416, { "content-range": `bytes */${size}` }); return res.end(); }
      end = Math.min(end, size - 1);
      res.writeHead(206, { ...h, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
      if (req.method === "HEAD") return res.end();
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    if (ZIP.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      res.writeHead(200, { ...h, "content-encoding": "gzip", vary: "accept-encoding" });
      if (req.method === "HEAD") return res.end();
      return fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    }
    res.writeHead(200, { ...h, "content-length": size });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Ошибка сервера");
  }
}).listen(PORT, "0.0.0.0", () => console.log(`HUNDO: http://localhost:${PORT}`));
