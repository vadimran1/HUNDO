// /api/push — подписка на напоминания «ты 2 дня не занимался».
//   GET                         → {enabled, publicKey}  (ключи VAPID создаются один раз и хранятся в базе)
//   POST {action:"subscribe", id, sub, lang}   — сохранить подписку браузера
//   POST {action:"seen", id}                    — ученик открыл приложение сегодня
//   POST {action:"unsubscribe", id}             — отключить напоминания
// id — случайный анонимный номер устройства, имени и почты сервер не знает.
import webpush from "web-push";
import { hasRedis, redis, redisKind, redisEnvNames, json, sameOrigin, todayMsk } from "./_redis.js";

const TTL = 120 * 24 * 3600; // подписка живёт 120 дней без открытия приложения

export async function vapid(){
  let pub = await redis("GET", "vapid:public");
  let priv = await redis("GET", "vapid:private");
  if(!pub || !priv){
    const k = webpush.generateVAPIDKeys();
    // NX: если два запроса пришли одновременно, сохранится только первая пара
    await redis("SET", "vapid:public", k.publicKey, "NX");
    await redis("SET", "vapid:private", k.privateKey, "NX");
    pub = await redis("GET", "vapid:public");
    priv = await redis("GET", "vapid:private");
  }
  return {pub, priv};
}

const validId = id => typeof id === "string" && /^[a-z0-9]{12,40}$/.test(id);

export default {
  async fetch(req){
    // без базы — подсказываем, какие похожие переменные видит сервер (только названия, без значений)
    if(!hasRedis) return json({enabled:false, error:"База данных не подключена", envSeen:redisEnvNames()}, req.method === "GET" ? 200 : 503);
    try{
      if(req.method === "GET"){
        const {pub} = await vapid();
        return json({enabled:true, publicKey:pub, db:redisKind});
      }
      if(req.method !== "POST") return json({error:"Метод не поддерживается"}, 405);
      if(!sameOrigin(req)) return json({error:"Запрос не с сайта приложения"}, 403);
      const body = await req.json().catch(() => null);
      if(!body || !validId(body.id)) return json({error:"Некорректный запрос"}, 400);
      const {action, id} = body;

      if(action === "subscribe"){
        const sub = body.sub;
        if(!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth)
          return json({error:"Некорректная подписка"}, 400);
        const lang = body.lang === "en" ? "en" : "ru";
        const record = JSON.stringify({endpoint:sub.endpoint, keys:{p256dh:String(sub.keys.p256dh), auth:String(sub.keys.auth)}, lang});
        if(record.length > 2000) return json({error:"Некорректная подписка"}, 400);
        await redis("SET", "push:sub:" + id, record, "EX", TTL);
        await redis("SET", "push:seen:" + id, todayMsk(), "EX", TTL);
        return json({ok:true});
      }
      if(action === "seen"){
        if(await redis("EXISTS", "push:sub:" + id)){
          await redis("SET", "push:seen:" + id, todayMsk(), "EX", TTL);
          await redis("EXPIRE", "push:sub:" + id, TTL);
        }
        return json({ok:true});
      }
      if(action === "unsubscribe"){
        await redis("DEL", "push:sub:" + id, "push:seen:" + id, "push:sent:" + id);
        return json({ok:true});
      }
      return json({error:"Неизвестное действие"}, 400);
    }catch(e){
      return json({enabled:false, error:"Ошибка базы данных", detail:String(e?.message || e).replace(/[\w.-]+:\d{2,5}/g, "…").slice(0, 160), db:redisKind}, 502);
    }
  },
};
