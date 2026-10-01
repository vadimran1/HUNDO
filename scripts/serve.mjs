// Локальная проверка «как на Vercel»: отдаёт папку dist и запускает api/chat.js.
//   npm run build
//   OPENROUTER_API_KEY=ваш_ключ node scripts/serve.mjs   →  http://localhost:3000
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(root, "dist");
const PORT = Number(process.env.PORT || 3000);
const chat = (await import("../api/chat.js")).default;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/chat") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const r = await chat.fetch(new Request(url, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    if (r.body) for await (const chunk of r.body) res.write(chunk);
    return res.end();
  }
  const p = url.pathname === "/app" ? "/app/" : /^\/en\/?$/.test(url.pathname) ? "/" : url.pathname; // как rewrites в vercel.json
  let file = path.join(DIST, decodeURIComponent(p));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("Не найдено"); }
  const h = { "content-type": TYPES[path.extname(file)] || "application/octet-stream" };
  if (/sw\.js$|version\.json$/.test(file)) h["cache-control"] = "no-store";
  res.writeHead(200, h);
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Сотка: http://localhost:${PORT}`));
