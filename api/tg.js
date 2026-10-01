// /api/tg — вебхук Telegram-бота для входа в HUNDO.
// Telegram присылает сюда сообщения боту. Нас интересует только «/start <код>»:
// по коду находим, какое устройство просило вход, и привязываем к нему этого пользователя Telegram.
// Подлинность проверяем по заголовку X-Telegram-Bot-Api-Secret-Token — его знает только Telegram.
import { hasRedis, json } from "./_redis.js";
import { PROVIDERS, APP_URL, BOT_TEXT, hookSecret, linkNonce, enabled } from "./_auth.js";

async function send(chatId, text, lang){
  const token = PROVIDERS.tg.token();
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:"POST", headers:{"content-type":"application/json"},
    body:JSON.stringify({
      chat_id:chatId, text,
      reply_markup:{inline_keyboard:[[{text:BOT_TEXT.button[lang], url:APP_URL + (lang === "en" ? "/app/?lang=en" : "/app/")}]]},
    }),
  }).catch(() => {});
}

export default {
  async fetch(req){
    if(req.method !== "POST") return json({ok:true});
    if(!enabled("tg") || !hasRedis) return json({ok:false}, 503);
    if(req.headers.get("x-telegram-bot-api-secret-token") !== hookSecret("tg", PROVIDERS.tg.token())) return json({ok:false}, 403);

    const upd = await req.json().catch(() => null);
    const msg = upd?.message;
    // всегда отвечаем 200, иначе Telegram будет повторять одно и то же сообщение
    if(!msg?.from || msg.chat?.type !== "private" || typeof msg.text !== "string") return json({ok:true});
    const lang0 = String(msg.from.language_code || "").startsWith("ru") ? "ru" : "en";
    const m = msg.text.trim().match(/^\/start(?:@\w+)?(?:\s+(\S+))?/);
    if(!m) { await send(msg.chat.id, BOT_TEXT.hello[lang0], lang0); return json({ok:true}); }
    if(!m[1]) { await send(msg.chat.id, BOT_TEXT.hello[lang0], lang0); return json({ok:true}); }

    try{
      const f = msg.from;
      const {result, lang} = await linkNonce(m[1], "tg", {
        id:f.id, name:[f.first_name, f.last_name].filter(Boolean).join(" "), username:f.username,
      });
      await send(msg.chat.id, BOT_TEXT[result][lang], lang);
    }catch{
      await send(msg.chat.id, lang0 === "ru" ? "Не получилось войти, попробуйте ещё раз через минуту." : "Sign-in failed, please try again in a minute.", lang0);
    }
    return json({ok:true});
  },
};
