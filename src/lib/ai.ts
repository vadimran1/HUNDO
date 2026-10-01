import { create } from "zustand";
import { useApp, type Settings } from "./store";
import { L, isEn } from "./i18n";

const SYSTEM_PROMPT = `Ты — терпеливый репетитор, который готовит российского школьника к ЕГЭ и ОГЭ.
Правила ответа:
— отвечай по-русски, коротко и по делу, без воды и лишних вступлений;
— объясняй по шагам и на примерах, опирайся на школьную программу и кодификатор ФИПИ;
— в расчётных заданиях показывай ход решения, а не только ответ;
— если вопрос расплывчатый, задай один уточняющий вопрос;
— не выдумывай даты, формулы и номера заданий: если не уверен, так и скажи;
— формулы записывай текстом, без LaTeX; не используй markdown-разметку со звёздочками.`;

const SYSTEM_PROMPT_EN = `You are a patient tutor preparing a student for the Russian state exams EGE (Unified State Exam, grade 11) and OGE (Basic State Exam, grade 9).
The student uses the app in English, so:
— answer in clear, simple English, briefly and to the point, no filler;
— explain step by step with examples, following the Russian school curriculum and the FIPI codifier;
— keep Russian terms in brackets when they help with the real exam, e.g. legal capacity (дееспособность);
— for the Russian language subject, quote Russian words and rules as they are and explain them in English;
— in calculation tasks show the working, not just the answer;
— if the question is vague, ask one clarifying question;
— never invent dates, formulas or task numbers: if unsure, say so;
— write formulas as plain text, no LaTeX; do not use markdown asterisks.`;

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

/** Сообщение в формате OpenAI: текст или текст + картинка (data:image/jpeg;base64,…) */
export type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type Msg = { role: "system" | "user" | "assistant"; content: string | Part[] };

/** Что просим у ИИ, когда ученик прислал фото задания */
export function photoPrompt(exam: string, subj?: string, answer?: string) {
  if (isEn()) return `The photo shows a task for the ${exam === "ОГЭ" ? "OGE" : "EGE"} (Russian state exam). ${subj ? `Subject: ${subj}.` : "Work out the subject."}
1) Rewrite the task as text — the first line must start with "Task: …" (keep Russian text as it is, then add a short English translation).
2) Solve it step by step, briefly and clearly, in English.
3) Give the answer the way it is written on the answer form — a line "Answer: …".
4) Name the FIPI codifier topic.
If there are several tasks in the photo, solve the first one and list the numbers of the others. If the text is unreadable, say so and ask for a clearer photo.${answer ? `\nMy answer: ${answer}. Check it and explain the mistake if there is one.` : ""}`;
  return `На фото — задание для подготовки к ${exam}. ${subj ? `Предмет: ${subj}.` : "Определи предмет."}
1) Перепиши условие текстом — первая строка «Условие: …».
2) Реши по шагам, коротко и понятно.
3) Запиши ответ так, как его вносят в бланк, — строкой «Ответ: …».
4) Назови тему по кодификатору ФИПИ.
Если на фото несколько заданий — разбери первое и перечисли номера остальных. Если текст не читается — так и скажи и попроси переснять.${answer ? `\nМой ответ: ${answer}. Проверь его и объясни ошибку, если она есть.` : ""}`;
}

/** Сообщение пользователя с фото задания */
export const withImage = (text: string, image: string): Msg => ({
  role: "user", content: [{ type: "text", text }, { type: "image_url", image_url: { url: image } }],
});

export async function askAI(messages: Msg[], onDelta: (piece: string) => void, signal?: AbortSignal, settingsOverride?: Settings) {
  const s = settingsOverride || useApp.getState().settings;
  if (!isAiReady(s, useServer.getState().state) && !(settingsOverride && settingsOverride.provider !== "server"))
    throw new AIError("no-key", L("ИИ не подключён", "AI is not connected"));
  const all: Msg[] = [{ role: "system", content: isEn() ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT }, ...messages];
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
  if (!res.body) throw new AIError("network", L("Пустой ответ", "Empty response"));

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
        ? L("Сервер ИИ сейчас недоступен. Проверьте интернет или укажите свой ключ в настройках. Тренажёр и статистика работают и так.",
            "The AI server is unavailable right now. Check your connection or add your own key in Settings. The trainer and stats still work.")
        : L("ИИ не подключён. Откройте настройки и введите ключ API.", "AI is not connected. Open Settings and enter an API key.");
      case "network": return L("Не удалось связаться с сервером ИИ. Проверьте интернет.", "Couldn't reach the AI server. Check your internet connection.");
      case "http-401": return L("Сервер отклонил ключ (401). Проверьте, что ключ скопирован целиком и активен.", "The server rejected the key (401). Make sure it was copied in full and is active.");
      case "http-402": return L("Закончился лимит бесплатных запросов (402). Попробуйте позже.", "The free request limit is used up (402). Try again later.");
      case "http-404": return L("Модель не найдена (404). Проверьте название модели.", "Model not found (404). Check the model name.");
      case "http-413": return L("Запрос слишком длинный. Сократите текст или очистите переписку.", "The request is too long. Shorten the text or clear the chat.");
      case "http-429": return L("Слишком много запросов подряд. Подождите минуту и повторите.", "Too many requests in a row. Wait a minute and try again.");
      case "http-503": return L("На сервере не настроен ключ ИИ. Автору: добавьте OPENROUTER_API_KEY в настройках проекта на Vercel.",
          "No AI key is configured on the server. Author: add OPENROUTER_API_KEY in the Vercel project settings.");
    }
    if (e.kind.startsWith("http-")) return L("Сервер вернул ошибку ", "The server returned error ") + e.kind.slice(5) + ". " + (e.message || "");
  }
  return L("Что-то пошло не так: ", "Something went wrong: ") + ((e as Error)?.message || e);
}
