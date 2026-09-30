// Серверная функция Vercel: /api/chat
// Приложение отправляет сюда сообщения, функция добавляет секретный ключ
// и передаёт запрос в OpenRouter (или любой OpenAI-совместимый сервис).
// Ответ приходит потоком, по мере генерации. Ключ никогда не попадает в браузер.
//
// Переменные окружения (Vercel → Project → Settings → Environment Variables):
//   OPENROUTER_API_KEY   — ключ, обязательно
//   AI_MODEL             — модель, по умолчанию openrouter/free
//   AI_BASE_URL          — адрес API, по умолчанию https://openrouter.ai/api/v1
//   AI_MAX_TOKENS        — предел длины ответа, по умолчанию 4000
//   RATE_LIMIT_PER_MIN   — запросов в минуту с одного адреса, по умолчанию 20

const KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
const MODEL = process.env.AI_MODEL || "openrouter/free";
const BASE = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 4000);
const RATE = Number(process.env.RATE_LIMIT_PER_MIN || 20);
const MAX_CHARS = 60000;       // суммарная длина сообщений в одном запросе
const MAX_MESSAGES = 30;

// Простой лимит частоты. Живёт в памяти одного экземпляра функции —
// не идеальная защита, но отсекает случайные «зацикленные» запросы.
const hits = new Map();
function limited(ip){
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if(hits.size > 5000) hits.clear();
  return list.length > RATE;
}

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers:{"content-type":"application/json; charset=utf-8", "cache-control":"no-store"},
  });
}

// Принимаем запросы только со своего сайта, чтобы ключом не пользовались чужие страницы
function sameOrigin(req){
  const origin = req.headers.get("origin");
  if(!origin) return true;
  try{ return new URL(origin).host === req.headers.get("host"); }
  catch{ return false; }
}

export default {
  async fetch(req){
    // GET — проверка: настроен ли ИИ на сервере
    if(req.method === "GET") return json({ok:Boolean(KEY), model:KEY ? MODEL : ""});
    if(req.method !== "POST") return json({error:"Метод не поддерживается"}, 405);
    if(!KEY) return json({error:"На сервере не настроен ключ ИИ"}, 503);
    if(!sameOrigin(req)) return json({error:"Запрос не с сайта приложения"}, 403);

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if(limited(ip)) return json({error:"Слишком много запросов. Подождите минуту."}, 429);

    let body;
    try{ body = await req.json(); }
    catch{ return json({error:"Некорректный запрос"}, 400); }

    const messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter(m => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-MAX_MESSAGES)
      .map(m => ({role:m.role, content:m.content}));
    const size = messages.reduce((n, m) => n + m.content.length, 0);
    if(!messages.length) return json({error:"Пустой запрос"}, 400);
    if(size > MAX_CHARS) return json({error:"Запрос слишком длинный"}, 413);

    const temperature = Math.min(1, Math.max(0, Number(body.temperature) || 0.3));

    let upstream;
    try{
      upstream = await fetch(BASE + "/chat/completions", {
        method:"POST",
        signal:req.signal,
        headers:{
          "content-type":"application/json",
          "authorization":"Bearer " + KEY,
          "http-referer":"https://" + (req.headers.get("host") || "hundo.vercel.app"),
          "x-title":"HUNDO",
        },
        body:JSON.stringify({model:MODEL, stream:true, temperature, max_tokens:MAX_TOKENS, messages}),
      });
    }catch(e){
      return json({error:"Сервис ИИ не отвечает"}, 502);
    }

    if(!upstream.ok){
      let detail = "";
      try{ detail = (await upstream.text()).slice(0, 300); }catch{}
      const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 502;
      return json({error:"Сервис ИИ вернул ошибку " + upstream.status, detail}, status);
    }

    // отдаём поток как есть: формат SSE совместим с OpenAI, приложение его уже понимает
    return new Response(upstream.body, {
      status:200,
      headers:{
        "content-type":"text/event-stream; charset=utf-8",
        "cache-control":"no-store, no-transform",
        "x-accel-buffering":"no",
      },
    });
  },
};
