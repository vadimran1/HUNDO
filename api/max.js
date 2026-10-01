// /api/max — вебхук бота в мессенджере MAX для входа в HUNDO.
// MAX присылает событие bot_started (пользователь открыл бота по ссылке max.ru/<бот>?start=<код>)
// или обычное сообщение «/start <код>». Подлинность: секрет в заголовке X-Max-Bot-Api-Secret
// или в параметре ?k= адреса вебхука — оба знает только MAX.
import { hasRedis, json } from "./_redis.js";
import { PROVIDERS, APP_URL, BOT_TEXT, MAX_API, hookSecret, linkNonce, enabled } from "./_auth.js";

async function send({chatId, userId}, text, lang){
  const q = chatId ? `chat_id=${chatId}` : `user_id=${userId}`;
  await fetch(`${MAX_API}/messages?${q}`, {
    method:"POST", headers:{"content-type":"application/json", authorization:PROVIDERS.max.token()},
    body:JSON.stringify({
      ...(chatId ? {chat_id:chatId} : {}), text,
      attachments:[{type:"inline_keyboard", payload:{buttons:[[{type:"link", text:BOT_TEXT.button[lang], url:APP_URL + (lang === "en" ? "/app/?lang=en" : "/app/")}]]}}],
    }),
  }).catch(() => {});
}

export default {
  async fetch(req){
    if(req.method !== "POST") return json({ok:true});
    if(!enabled("max") || !hasRedis) return json({ok:false}, 503);
    const secret = hookSecret("max", PROVIDERS.max.token());
    const given = req.headers.get("x-max-bot-api-secret") || new URL(req.url).searchParams.get("k");
    if(given !== secret) return json({ok:false}, 403);

    const upd = await req.json().catch(() => null);
    if(!upd) return json({ok:true});
    let user, nonce = "", to;
    if(upd.update_type === "bot_started"){
      user = upd.user;
      nonce = typeof upd.payload === "string" ? upd.payload.trim() : "";
      to = {chatId:upd.chat_id, userId:user?.user_id};
    } else if(upd.update_type === "message_created"){
      const m = upd.message;
      user = m?.sender;
      const text = String(m?.body?.text || "").trim();
      const hit = text.match(/^\/start(?:\s+(\S+))?/);
      if(!hit) return json({ok:true});
      nonce = hit[1] || "";
      to = {chatId:m?.recipient?.chat_id, userId:user?.user_id};
    } else return json({ok:true});
    if(!user?.user_id) return json({ok:true});
    const lang0 = String(upd.user_locale || "").startsWith("en") ? "en" : "ru";
    if(!nonce){ await send(to, BOT_TEXT.hello[lang0], lang0); return json({ok:true}); }

    try{
      const {result, lang} = await linkNonce(nonce, "max", {
        id:user.user_id, name:user.name || [user.first_name, user.last_name].filter(Boolean).join(" "), username:user.username,
      });
      await send(to, BOT_TEXT[result][lang], lang);
    }catch{
      await send(to, lang0 === "ru" ? "Не получилось войти, попробуйте ещё раз через минуту." : "Sign-in failed, please try again in a minute.", lang0);
    }
    return json({ok:true});
  },
};
