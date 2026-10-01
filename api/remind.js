// /api/remind — раз в день (Vercel Cron, 18:00 по Москве) рассылает напоминания тем,
// кто не открывал HUNDO 2 дня и больше. Одному устройству — не чаще раза в день.
// Запускать вручную безопасно: повторный запуск в тот же день ничего не отправит.
import webpush from "web-push";
import { hasRedis, redis, json, todayMsk } from "./_redis.js";
import { vapid } from "./push.js";

const TEXT = {
  ru: (d) => ({ title:"HUNDO", body: d >= 7 ? `Неделя без подготовки. Начни с 5 карточек — это 2 минуты.` : `${d} ${d < 5 ? "дня" : "дней"} без подготовки. 10 минут сегодня — и серия снова твоя.` }),
  en: (d) => ({ title:"HUNDO", body: d >= 7 ? "A week without practice. Start with 5 flashcards — it takes 2 minutes." : `${d} days without practice. 10 minutes today and your streak is back.` }),
};

export default {
  async fetch(req){
    if(!hasRedis) return json({ok:false, error:"База данных не подключена"}, 503);
    // Vercel Cron присылает этот заголовок, если в проекте задан CRON_SECRET
    if(process.env.CRON_SECRET && req.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET)
      return json({error:"Нет доступа"}, 401);
    const today = todayMsk();
    // не больше одного прогона в день
    const first = await redis("SET", "remind:ran:" + today, "1", "NX", "EX", 2 * 86400);
    if(first !== "OK") return json({ok:true, skipped:"уже запускалось сегодня"});

    const {pub, priv} = await vapid();
    webpush.setVapidDetails("mailto:hundo@example.com", pub, priv);

    let cursor = "0", sent = 0, removed = 0, checked = 0;
    do{
      const [next, keys] = await redis("SCAN", cursor, "MATCH", "push:sub:*", "COUNT", 200);
      cursor = next;
      for(const key of keys){
        checked++;
        const id = key.slice("push:sub:".length);
        const [rec, seen, last] = await Promise.all([redis("GET", key), redis("GET", "push:seen:" + id), redis("GET", "push:sent:" + id)]);
        if(!rec || !seen || last === today) continue;
        const days = Math.round((Date.parse(today) - Date.parse(seen)) / 864e5);
        if(days < 2) continue;
        let sub; try{ sub = JSON.parse(rec); }catch{ continue; }
        const msg = (TEXT[sub.lang] || TEXT.ru)(days);
        try{
          await webpush.sendNotification({endpoint:sub.endpoint, keys:sub.keys}, JSON.stringify({...msg, url:"/app/#train"}), {TTL:12 * 3600});
          await redis("SET", "push:sent:" + id, today, "EX", 3 * 86400);
          sent++;
        }catch(e){
          if(process.env.REMIND_DEBUG) console.log("push error", e?.statusCode, e?.message);
          // 404/410 — подписка больше не действует (приложение удалили или запретили уведомления)
          if(e?.statusCode === 404 || e?.statusCode === 410){ await redis("DEL", key, "push:seen:" + id); removed++; }
        }
      }
    }while(cursor !== "0");
    return json({ok:true, checked, sent, removed});
  },
};
