// Серверная функция Vercel: /api/chat
// Приложение отправляет сюда сообщения, функция добавляет секретный ключ
// и передаёт запрос в OpenAI-совместимый сервис ИИ. Ответ приходит потоком.
// Ключ никогда не попадает в браузер.
//
// Сервис определяется по ключу автоматически:
//   ключ OpenRouter (sk-or-…)  → openrouter.ai,       модель openrouter/free
//   любой другой ключ          → OdiRouter (odirouter.ai), модель free-gemini-2.5-flash
//
// Переменные окружения (Vercel → Project → Settings → Environment Variables):
//   OPENROUTER_API_KEY   — ключ (можно и AI_API_KEY / ODIROUTER_API_KEY), обязательно
//   AI_MODEL             — другая модель, например free-gpt-5.4-mini
//   AI_BASE_URL          — другой адрес API
//   AI_MAX_TOKENS        — предел длины ответа, по умолчанию 4000
//   RATE_LIMIT_PER_MIN   — запросов в минуту с одного адреса, по умолчанию 20
//   AI_VISION_MODEL      — модель для запросов с фото (по умолчанию та же, Gemini 2.5 Flash понимает картинки)

const KEY = String(process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || process.env.ODIROUTER_API_KEY || "")
  .trim().replace(/^["'`]+|["'`]+$/g, "").replace(/^Bearer\s+/i, "").trim();
const IS_OPENROUTER = KEY.startsWith("sk-or-");
const PROVIDER = process.env.AI_BASE_URL ? "custom" : IS_OPENROUTER ? "openrouter" : "odirouter";
const MODEL = process.env.AI_MODEL || (IS_OPENROUTER ? "openrouter/free" : "free-gemini-2.5-flash");
const BASE = (process.env.AI_BASE_URL || (IS_OPENROUTER ? "https://openrouter.ai/api/v1" : "https://api.odirouter.ai/v1")).replace(/\/+$/, "");
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 4000);
const RATE = Number(process.env.RATE_LIMIT_PER_MIN || 20);
const MAX_CHARS = 60000;       // суммарная длина сообщений в одном запросе
const MAX_MESSAGES = 30;
const MAX_IMAGES = 2;          // фото задания в одном запросе
const MAX_IMAGE_CHARS = 2_800_000; // ~2 МБ картинки в base64
const VISION_MODEL = process.env.AI_VISION_MODEL || MODEL;

// Сообщение: строка или массив частей OpenAI (текст и картинка data:image/…;base64)
function cleanMessage(m, counter){
  if(!m || !["system", "user", "assistant"].includes(m.role)) return null;
  if(typeof m.content === "string") return {role:m.role, content:m.content};
  if(m.role !== "user" || !Array.isArray(m.content)) return null;
  const parts = [];
  for(const p of m.content){
    if(p?.type === "text" && typeof p.text === "string") parts.push({type:"text", text:p.text});
    else if(p?.type === "image_url" && typeof p.image_url?.url === "string"
      && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image_url.url.slice(0, 64) + "=")
      && p.image_url.url.length <= MAX_IMAGE_CHARS && counter.images < MAX_IMAGES){
      counter.images++;
      parts.push({type:"image_url", image_url:{url:p.image_url.url}});
    }
  }
  return parts.length ? {role:"user", content:parts} : null;
}
const textLength = m => typeof m.content === "string" ? m.content.length
  : m.content.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0);

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
    // GET — проверка: настроен ли ИИ на сервере. /api/chat?check=1 — проверить ключ у OpenRouter
    if(req.method === "GET"){
      const info = {
        ok:Boolean(KEY), model:KEY ? MODEL : "", provider:KEY ? PROVIDER : "",
        keyLength:KEY.length,
      };
      if(new URL(req.url).searchParams.get("check") && KEY){
        try{
          // проверка ключа без траты лимита: OpenRouter — /key, остальные — список моделей
          const r = await fetch(BASE + (IS_OPENROUTER && PROVIDER === "openrouter" ? "/key" : "/models"), {headers:{authorization:"Bearer " + KEY}});
          let detail = "";
          try{ detail = (await r.text()).slice(0, 200); }catch{}
          info.check = {status:r.status, ok:r.ok, detail:r.ok ? "ключ принят" : detail};
        }catch(e){ info.check = {status:0, ok:false, detail:"Сервис ИИ не отвечает"}; }
      }
      return json(info);
    }
    if(req.method !== "POST") return json({error:"Метод не поддерживается"}, 405);
    if(!KEY) return json({error:"На сервере не настроен ключ ИИ"}, 503);
    if(!sameOrigin(req)) return json({error:"Запрос не с сайта приложения"}, 403);

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if(limited(ip)) return json({error:"Слишком много запросов. Подождите минуту."}, 429);

    let body;
    try{ body = await req.json(); }
    catch{ return json({error:"Некорректный запрос"}, 400); }

    const counter = {images:0};
    const messages = (Array.isArray(body?.messages) ? body.messages : [])
      .slice(-MAX_MESSAGES)
      .map(m => cleanMessage(m, counter))
      .filter(Boolean);
    const size = messages.reduce((n, m) => n + textLength(m), 0);
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
        body:JSON.stringify({model:counter.images ? VISION_MODEL : MODEL, stream:true, temperature, max_tokens:MAX_TOKENS, messages}),
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
