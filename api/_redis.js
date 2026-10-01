// Общий помощник для базы Upstash Redis (Vercel → Storage → Upstash for Redis).
// Файлы с «_» в начале Vercel не превращает в адреса /api/…, это просто модуль.
// Переменные окружения Vercel добавляет сам при подключении базы к проекту.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const hasRedis = Boolean(URL_ && TOKEN);

/** Одна команда Redis: redis("SET", "ключ", "значение", "EX", 60) */
export async function redis(...cmd){
  if(!hasRedis) throw new Error("База данных не подключена");
  const r = await fetch(URL_, {
    method:"POST",
    headers:{authorization:"Bearer " + TOKEN, "content-type":"application/json"},
    body:JSON.stringify(cmd.map(String)),
  });
  const j = await r.json().catch(() => ({}));
  if(!r.ok || j.error) throw new Error(j.error || "Redis " + r.status);
  return j.result;
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
