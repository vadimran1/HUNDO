// /api/auth — аккаунты через Telegram и MAX и синхронизация прогресса.
//   GET                               → какие способы входа включены
//   GET ?check=1                      → проверить и переустановить вебхуки ботов (без секретов в ответе)
//   POST {action:"start", provider:"tg"|"max", lang}   → {nonce, url} — ссылка на бота
//   POST {action:"poll", nonce}                         → {status:"pending"|"expired"} или {status:"ok", token, user}
//   с заголовком Authorization: Bearer <token>:
//   POST {action:"me"}                → {user, updated}
//   POST {action:"load"}              → {state, updated}
//   POST {action:"save", state}       → {updated}
//   POST {action:"logout"}            → выйти на этом устройстве
import { hasRedis, redis, json, sameOrigin } from "./_redis.js";
import { APP_URL, NONCE_TTL, SESSION_TTL, PROVIDERS, MAX_API, enabled, rand, hookSecret, validNonce, sessionUser } from "./_auth.js";

const MAX_STATE = 400_000; // ~400 КБ на ученика с запасом

/** Один раз ставим вебхук бота на наш адрес; повторно — только если поменялся токен или адрес */
async function ensureHook(p, force = false){
  const token = PROVIDERS[p].token();
  const secret = hookSecret(p, token);
  const mark = secret + "|" + APP_URL;
  if(!force && (await redis("GET", "hook:" + p)) === mark) return {ok:true, cached:true};
  let res;
  if(p === "tg"){
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method:"POST", headers:{"content-type":"application/json"},
      body:JSON.stringify({url:APP_URL + "/api/tg", secret_token:secret, allowed_updates:["message"], drop_pending_updates:true}),
    });
    const j = await r.json().catch(() => ({}));
    res = {ok:!!j.ok, error:j.ok ? undefined : String(j.description || r.status)};
  } else {
    const r = await fetch(`${MAX_API}/subscriptions`, {
      method:"POST", headers:{"content-type":"application/json", authorization:token},
      body:JSON.stringify({url:`${APP_URL}/api/max?k=${secret}`, update_types:["bot_started", "message_created"], secret}),
    });
    const j = await r.json().catch(() => ({}));
    res = {ok:r.ok && j.success !== false, error:r.ok ? undefined : String(j.message || j.code || r.status)};
  }
  if(res.ok) await redis("SET", "hook:" + p, mark);
  return res;
}

async function hookInfo(){
  const out = {};
  if(enabled("tg")){
    const set = await ensureHook("tg", true).catch(e => ({ok:false, error:String(e.message)}));
    const r = await fetch(`https://api.telegram.org/bot${PROVIDERS.tg.token()}/getWebhookInfo`).then(r => r.json()).catch(() => ({}));
    const w = r.result || {};
    out.tg = {set:set.ok, error:set.error, url:w.url, pending:w.pending_update_count, lastError:w.last_error_message};
  }
  if(enabled("max")) out.max = await ensureHook("max", true).catch(e => ({ok:false, error:String(e.message)}));
  return out;
}

const publicUser = u => u && {name:u.name, username:u.username, provider:u.provider};

export default {
  async fetch(req){
    const providers = Object.fromEntries(Object.keys(PROVIDERS).map(p => [p, {on:enabled(p), bot:enabled(p) ? PROVIDERS[p].bot() : ""}]));
    if(req.method === "GET"){
      const check = new URL(req.url).searchParams.get("check");
      if(check && hasRedis) return json({db:true, providers, hooks:await hookInfo()});
      return json({db:hasRedis, providers});
    }
    if(req.method !== "POST") return json({error:"Метод не поддерживается"}, 405);
    if(!sameOrigin(req)) return json({error:"Запрос не с сайта приложения"}, 403);
    if(!hasRedis) return json({error:"База данных не подключена"}, 503);
    const body = await req.json().catch(() => null);
    if(!body || typeof body.action !== "string") return json({error:"Некорректный запрос"}, 400);

    try{
      const {action} = body;
      if(action === "start"){
        const p = body.provider;
        if(!PROVIDERS[p]) return json({error:"Неизвестный способ входа"}, 400);
        if(!enabled(p)) return json({error:`Вход через ${PROVIDERS[p].title} ещё не настроен`}, 503);
        const hook = await ensureHook(p);
        if(!hook.ok) return json({error:"Бот не отвечает: " + (hook.error || "ошибка вебхука")}, 502);
        const nonce = rand(16);
        await redis("SET", "auth:n:" + nonce, JSON.stringify({s:"pending", p, lang:body.lang === "en" ? "en" : "ru", t:Date.now()}), "EX", NONCE_TTL);
        return json({nonce, url:PROVIDERS[p].link(PROVIDERS[p].bot(), nonce), ttl:NONCE_TTL});
      }

      if(action === "poll"){
        if(!validNonce(body.nonce)) return json({status:"expired"});
        const raw = await redis("GET", "auth:n:" + body.nonce);
        if(!raw) return json({status:"expired"});
        const rec = JSON.parse(raw);
        if(rec.s !== "ok") return json({status:"pending"});
        // код одноразовый: забираем и сразу удаляем, чтобы второй раз им войти было нельзя
        const del = await redis("DEL", "auth:n:" + body.nonce);
        if(Number(del) !== 1) return json({status:"expired"});
        const token = rand(32);
        await redis("SET", "sess:" + token, rec.uid, "EX", SESSION_TTL);
        const user = JSON.parse((await redis("GET", "user:" + rec.uid)) || "null");
        const meta = JSON.parse((await redis("GET", `user:${rec.uid}:meta`)) || "null");
        return json({status:"ok", token, user:publicUser(user), updated:meta?.updated || 0});
      }

      const s = await sessionUser(req);
      if(!s) return json({error:"Нужно войти заново", relogin:true}, 401);
      // каждое обращение продлевает сессию
      await redis("EXPIRE", "sess:" + s.token, SESSION_TTL);

      if(action === "me"){
        const user = JSON.parse((await redis("GET", "user:" + s.uid)) || "null");
        const meta = JSON.parse((await redis("GET", `user:${s.uid}:meta`)) || "null");
        return json({user:publicUser(user), updated:meta?.updated || 0});
      }
      if(action === "load"){
        const raw = await redis("GET", `user:${s.uid}:state`);
        const meta = JSON.parse((await redis("GET", `user:${s.uid}:meta`)) || "null");
        return json({state:raw ? JSON.parse(raw) : null, updated:meta?.updated || 0});
      }
      if(action === "save"){
        if(!body.state || typeof body.state !== "object" || Array.isArray(body.state)) return json({error:"Некорректные данные"}, 400);
        const raw = JSON.stringify(body.state);
        if(raw.length > MAX_STATE) return json({error:"Слишком много данных"}, 413);
        const updated = Date.now();
        await redis("SET", `user:${s.uid}:state`, raw);
        await redis("SET", `user:${s.uid}:meta`, JSON.stringify({updated, size:raw.length}));
        return json({updated});
      }
      if(action === "logout"){
        await redis("DEL", "sess:" + s.token);
        return json({ok:true});
      }
      return json({error:"Неизвестное действие"}, 400);
    }catch(e){
      return json({error:"Ошибка сервера", detail:String(e?.message || e).replace(/[\w.-]+:\d{2,5}/g, "…").replace(/bot\d+:[\w-]+/g, "bot…").slice(0, 160)}, 502);
    }
  },
};
