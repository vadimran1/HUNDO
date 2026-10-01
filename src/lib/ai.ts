import { create } from "zustand";
import { useApp, type Settings } from "./store";

const SYSTEM_PROMPT = `Ты — терпеливый репетитор, который готовит российского школьника к ЕГЭ и ОГЭ.
Правила ответа:
— отвечай по-русски, коротко и по делу, без воды и лишних вступлений;
— объясняй по шагам и на примерах, опирайся на школьную программу и кодификатор ФИПИ;
— в расчётных заданиях показывай ход решения, а не только ответ;
— если вопрос расплывчатый, задай один уточняющий вопрос;
— не выдумывай даты, формулы и номера заданий: если не уверен, так и скажи;
— формулы записывай текстом, без LaTeX; не используй markdown-разметку со звёздочками.`;

/** Статус серверного ИИ (функция /api/chat на Vercel) */
export const useServer = create<{ state: "unknown" | "ok" | "off"; model: string }>(() => ({ state: "unknown", model: "" }));

export async function checkServer() {
  try {
    const r = await fetch("/api/chat", { cache: "no-store" });
    const j = r.ok && (r.headers.get("content-type") || "").includes("json") ? await r.json() : null;
    useServer.setState({ state: j && j.ok ? "ok" : "off", model: (j && j.model) || "" });
  } catch {
    useServer.setState({ state: "off", model: "" });
  }
}

export function isAiReady(s: Settings, server: string) {
  return s.provider === "server" ? server === "ok" : !!(s.key && s.base && s.model);
}
export function useAiReady() {
  const s = useApp(x => x.settings);
  const server = useServer(x => x.state);
  return isAiReady(s, server);
}

export class AIError extends Error {
  constructor(public kind: string, message: string) { super(message); }
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function askAI(messages: Msg[], onDelta: (piece: string) => void, signal?: AbortSignal, settingsOverride?: Settings) {
  const s = settingsOverride || useApp.getState().settings;
  if (!isAiReady(s, useServer.getState().state) && !(settingsOverride && settingsOverride.provider !== "server"))
    throw new AIError("no-key", "ИИ не подключён");
  const all: Msg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
  let res: Response;
  try {
    res = s.provider === "server"
      ? await fetch("/api/chat", {
          method: "POST", signal, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ temperature: 0.3, messages: all }),
        })
      : await fetch(s.base.replace(/\/+$/, "") + "/chat/completions", {
          method: "POST", signal,
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.key },
          body: JSON.stringify({ model: s.model, stream: true, temperature: 0.3, messages: all }),
        });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new AIError("network", (e as Error).message);
  }
  if (!res.ok) {
    let d = "";
    try { d = (await res.text()).slice(0, 400); const j = JSON.parse(d); d = j.error || d; } catch { /* текст как есть */ }
    throw new AIError("http-" + res.status, d);
  }
  if (!res.body) throw new AIError("network", "Пустой ответ");

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        // убираем markdown-выделение звёздочками, если модель его всё же добавила
        const piece = (JSON.parse(data).choices?.[0]?.delta?.content || "").replace(/\*\*/g, "");
        if (piece) { full += piece; onDelta(piece); }
      } catch { /* незавершённый кусок */ }
    }
  }
  return full;
}

export function aiErrorText(e: unknown) {
  if (e instanceof AIError) {
    const server = useApp.getState().settings.provider === "server";
    switch (e.kind) {
      case "no-key": return server
        ? "Сервер ИИ сейчас недоступен. Проверьте интернет или укажите свой ключ в настройках. Тренажёр и статистика работают и так."
        : "ИИ не подключён. Откройте настройки и введите ключ API.";
      case "network": return "Не удалось связаться с сервером ИИ. Проверьте интернет.";
      case "http-401": return "Сервер отклонил ключ (401). Проверьте, что ключ скопирован целиком и активен.";
      case "http-402": return "Закончился лимит бесплатных запросов (402). Попробуйте позже.";
      case "http-404": return "Модель не найдена (404). Проверьте название модели.";
      case "http-413": return "Запрос слишком длинный. Сократите текст или очистите переписку.";
      case "http-429": return "Слишком много запросов подряд. Подождите минуту и повторите.";
      case "http-503": return "На сервере не настроен ключ ИИ. Автору: добавьте OPENROUTER_API_KEY в настройках проекта на Vercel.";
    }
    if (e.kind.startsWith("http-")) return "Сервер вернул ошибку " + e.kind.slice(5) + ". " + (e.message || "");
  }
  return "Что-то пошло не так: " + ((e as Error)?.message || e);
}
