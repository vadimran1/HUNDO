// Общий помощник для базы Redis (Vercel → Storage).
// Файлы с «_» в начале Vercel не превращает в адреса /api/…, это просто модуль.
//
// Подходит любая из двух баз, ключи Vercel добавляет сам при подключении:
//   • Upstash for Redis — переменные …KV_REST_API_URL / …KV_REST_API_TOKEN
//     или …UPSTASH_REDIS_REST_URL / …_TOKEN (с любым префиксом, например STORAGE_KV_REST_API_URL);
//   • обычный Redis (Redis Cloud и др.) — переменная …REDIS_URL вида redis://…  или rediss://…
import { createClient } from "redis";

const env = process.env;
// ищем переменную по окончанию названия: Vercel может добавить к нему префикс
const find = (...ends) => {
  for (const end of ends) {
    if (env[end]) return env[end];
    const k = Object.keys(env).find(n => n.endsWith("_" + end) && env[n]);
    if (k) return env[k];
  }
  return "";
};

const REST_URL = find("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
const REST_TOKEN = find("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");
const TCP_URL = (() => {
  const u = find("REDIS_URL", "KV_URL", "REDIS_TLS_URL");
  return /^rediss?:\/\//.test(u) ? u : "";
})();

export const hasRedis = Boolean((REST_URL && REST_TOKEN) || TCP_URL);
export const redisKind = REST_URL && REST_TOKEN ? "upstash-rest" : TCP_URL ? "redis-tcp" : "";

/** Названия (не значения!) переменных, похожих на ключи базы — для подсказки, если что-то не так */
export const redisEnvNames = () => Object.keys(env).filter(n => /REDIS|KV_|UPSTASH/i.test(n)).sort();

let tcp = null;
async function tcpClient(){
  if(tcp?.isOpen) return tcp;
  tcp = createClient({url:TCP_URL, socket:{connectTimeout:5000, reconnectStrategy:false}});
  tcp.on("error", () => {});
  await tcp.connect();
  return tcp;
}

/** Одна команда Redis: redis("SET", "ключ", "значение", "EX", 60) */
export async function redis(...cmd){
  if(!hasRedis) throw new Error("База данных не подключена");
  const args = cmd.map(String);
  if(REST_URL && REST_TOKEN){
    const r = await fetch(REST_URL, {
      method:"POST",
      headers:{authorization:"Bearer " + REST_TOKEN, "content-type":"application/json"},
      body:JSON.stringify(args),
    });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || j.error) throw new Error(j.error || "Redis " + r.status);
    return j.result;
  }
  const c = await tcpClient();
  return c.sendCommand(args);
}

export function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers:{"content-type":"application/json; charset=utf-8", "cache-control":"no-store"},
  });
}

export function sameOrigin(req){
  const origin = req.headers.get("origin");
  if(!origin) return true;
  try{ return new URL(origin).host === req.headers.get("host"); }
  catch{ return false; }
}

export const todayMsk = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
