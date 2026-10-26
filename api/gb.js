// /api/gb — ретранслятор мини-приложения GiftBot (бот перепродажи подарков, работает на компьютере владельца).
// Провайдер у компьютера режет входящие туннели, поэтому связь только исходящая, через базу Redis:
//   1) Telegram открывает https://www.hundo.online/giftbot/… — vercel.json переписывает это в /api/gb?p=/…;
//   2) функция кладёт запрос в очередь gb:q и ждёт ответ в списке gb:r:<номер> (до 25 секунд);
//   3) бот сам забирает запросы из gb:q, отвечает своим сервером и кладёт ответ в gb:r:<номер>.
// Права проверяет бот: каждый запрос к его API подписан Telegram (initData). Здесь — только лимиты.
import crypto from "node:crypto";
import { hasRedis, redis } from "./_redis.js";

const QUEUE = "gb:q";
const WAIT = 25_000;
const MAX_BODY = 256 * 1024;
const PASS = ["authorization", "content-type", "x-init-data"];   // заголовки, которые нужны боту

const text = (body, status) => new Response(body, {
  status, headers:{"content-type":"text/plain; charset=utf-8", "cache-control":"no-store"},
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ждём ответ опросом, а не BLPOP: общее соединение с базой нельзя занимать на 25 секунд — им пользуется весь HUNDO
async function reply(key){
  for(let i = 0, end = Date.now() + WAIT; Date.now() < end; i++){
    const v = await redis("LPOP", key);
    if(v) return v;
    await sleep(i < 10 ? 100 : 250);
  }
  return null;
}

export default {
  async fetch(req){
    if(!hasRedis) return text("GiftBot: база не подключена", 503);
    if(!["GET", "POST", "DELETE"].includes(req.method)) return text("Метод не поддерживается", 405);
    const url = new URL(req.url);
    const p = url.searchParams.get("p") || "/";
    if(!/^\/[\w\-./]*$/.test(p) || p.includes("..")) return text("Не найдено", 404);
    const body = req.method === "GET" ? "" : await req.text();
    if(body.length > MAX_BODY) return text("Слишком большой запрос", 413);

    const query = new URLSearchParams(url.searchParams);
    query.delete("p");
    const headers = {};
    for(const h of PASS){
      const v = req.headers.get(h);
      if(v) headers[h] = v.slice(0, 8192);
    }
    const id = crypto.randomBytes(12).toString("hex");
    const qs = query.toString();
    const job = {id, at:Date.now(), method:req.method, path:p + (qs ? "?" + qs : ""), headers, body};
    await redis("RPUSH", QUEUE, JSON.stringify(job));
    await redis("LTRIM", QUEUE, "-200", "-1");     // бот выключен — очередь не растёт бесконечно
    await redis("EXPIRE", QUEUE, "120");

    const raw = await reply("gb:r:" + id);
    if(!raw) return text("GiftBot не ответил — бот запущен на компьютере?", 504);
    const r = JSON.parse(raw);
    return new Response(r.body ?? "", {
      status:r.status || 200,
      headers:{"content-type":r.type || "application/json; charset=utf-8", "cache-control":"no-store"},
    });
  },
};
