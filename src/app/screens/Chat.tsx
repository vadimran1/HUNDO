import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Camera, X } from "lucide-react";
import { useApp, useUI, type ChatMsg } from "@/lib/store";
import { subjName } from "@/lib/data";
import { useT, isEn, examLabel, L } from "@/lib/i18n";
import { askAI, aiErrorText, photoPrompt, useAiReady, withImage, type Msg } from "@/lib/ai";
import { prepareImage } from "@/lib/image";
import { daysLeft, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Typing } from "@/components/ui/controls";

const SUGG: [string, string][] = [
  ["Объясни «Смутное время» за 5 минут", "Explain the Time of Troubles in 5 minutes"],
  ["Как находить степень окисления?", "How do I find an oxidation state?"],
  ["Составь план на неделю по моим предметам", "Make a one-week plan for my subjects"],
  ["Чем правоспособность отличается от дееспособности?", "Passive vs active legal capacity — what's the difference?"],
];

type Photo = { image: string; thumb: string };

export function ChatScreen() {
  const { chat, patch, exam, subjects, examDate } = useApp();
  const ready = useAiReady();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [live, setLive] = useState<{ text: string; error?: string } | null>(null);
  const busy = !!live && !live.error;
  const ta = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const t = useT();

  const grow = () => { const t = ta.current; if (t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; } };
  const toBottom = (smooth = true) => bottom.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });

  /** prompt уходит ИИ; display — то, что видно в пузыре (короче, если prompt длинный) */
  const send = async (prompt: string, img?: Photo | null, display?: string) => {
    prompt = prompt.trim();
    if ((!prompt && !img) || busy) return;
    let shown = display || prompt;
    if (img && !display) {
      // фото из чата: просим переписать условие и решить, вопрос ученика — дополнением
      shown = prompt || L("Разбери задание с фото", "Explain the task in the photo");
      prompt = photoPrompt(exam) + (prompt ? "\n" + L("Вопрос ученика: ", "Student's question: ") + prompt : "");
    }
    setText(""); setPhoto(null); setTimeout(grow, 0);
    const history: ChatMsg[] = [...useApp.getState().chat, { role: "user", content: shown, ...(img ? { image: img.thumb } : {}) }];
    patch({ chat: history });
    setLive({ text: "" });
    setTimeout(() => toBottom(), 30);
    const ctx = isEn()
      ? `About me: I'm preparing for the ${examLabel(exam)} (Russian state exam), grade ${exam === "ОГЭ" ? 9 : 11}. Subjects: ${subjects.map(s => subjName(s)).join(", ")}. ${daysLeft(examDate)} days until the exam. Please answer in English.`
      : `Контекст обо мне: готовлюсь к ${exam}, ${exam === "ОГЭ" ? 9 : 11} класс. Предметы: ${subjects.map(s => subjName(s)).join(", ")}. До экзамена ${daysLeft(examDate)} дн.`;
    // в истории — только текст; фото отправляем один раз, вместе с последним сообщением
    const past: Msg[] = history.slice(-12, -1).map(m => ({ role: m.role, content: m.content }));
    const last: Msg = img ? withImage(prompt, img.image) : { role: "user", content: prompt };
    try {
      let full = "";
      await askAI([{ role: "user", content: ctx }, ...past, last], d => {
        full += d; setLive({ text: full });
        if (innerHeight + scrollY > document.body.scrollHeight - 160) toBottom(false);
      });
      patch({ chat: [...history, { role: "assistant", content: full }] });
      setLive(null);
    } catch (e) {
      setLive({ text: "", error: aiErrorText(e) });
    }
  };

  const pick = async (f?: File) => {
    if (!f) return;
    setPreparing(true);
    try { setPhoto(await prepareImage(f)); }
    catch { setLive({ text: "", error: L("Не получилось открыть фото. Попробуйте другой снимок.", "Couldn't open the photo. Try another one.") }); }
    finally { setPreparing(false); if (file.current) file.current.value = ""; }
  };

  // «Спросить ИИ» и «Фото задания» с других экранов приходят сюда через pendingChat
  useEffect(() => {
    const p = useUI.getState().pendingChat;
    if (p) {
      useUI.setState({ pendingChat: null });
      setTimeout(() => send(p.text, p.image && p.thumb ? { image: p.image, thumb: p.thumb } : null, p.display), 350);
    } else if (chat.length) setTimeout(() => toBottom(false), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lg:mx-auto lg:max-w-[760px]">
      <AnimatePresence>
        {!chat.length && !live && (
          <motion.div exit={{ opacity: 0, y: -8 }} className="pt-7 pb-2">
            <div className="mb-3.5 flex items-center gap-2 font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
              <b className="font-bold text-fg">{t("ИИ-репетитор", "AI tutor")}</b><span className="h-px w-3.5 bg-line-2" /><span>{ready ? t("подключён", "online") : t("не подключён", "offline")}</span>
            </div>
            <h2 className="mb-1.5 font-display text-2xl font-bold tracking-[-.02em] lg:text-[36px]">{t("Спросите что угодно по подготовке", "Ask anything about your prep")}</h2>
            <p className="text-fg-2">{t("Тема кодификатора, формат задания, проверка эссе или разбор ошибки. Можно прислать фото задания — кнопка с камерой внизу.", "A codifier topic, a task format, an essay check or a mistake to go through. You can also send a photo of a task — the camera button below.")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGG.map(([ru, en]) => t(ru, en)).map((s, i) => (
                <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => send(s)} disabled={!ready}
                  className="rounded-full border border-line-2 px-3 py-2 text-left text-[13px] text-fg-2 transition-colors hover:border-fg hover:text-fg disabled:opacity-50">{s}</motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2.5 pt-[18px]">
        {chat.map((m, i) => <Bubble key={i} me={m.role === "user"} text={m.content} image={m.image} animate={false} />)}
        {live && (live.error
          ? <div className="hatch rounded-2xl border border-line-2 px-3.5 py-3 text-[13.5px]">{live.error}</div>
          : <Bubble me={false} text={live.text} animate />)}
      </div>

      <div ref={bottom} className="sticky bottom-[calc(74px+env(safe-area-inset-bottom,0px))] z-10 bg-[linear-gradient(transparent,var(--bg)_30%)] pt-3 pb-1.5 lg:bottom-0 lg:pb-6">
        <AnimatePresence>
          {(photo || preparing) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="mb-2 flex items-center gap-3 rounded-2xl border border-line-2 bg-bg-2 p-2 pr-3">
              {photo ? <img src={photo.thumb} alt="" className="size-14 rounded-xl object-cover" /> : <span className="grid size-14 place-items-center rounded-xl bg-bg-3"><Typing /></span>}
              <span className="min-w-0 flex-1 text-[13px] text-fg-2">
                {photo ? t("Фото готово. Добавьте вопрос или просто отправьте — ИИ перепишет условие и решит.", "Photo ready. Add a question or just send — the AI will transcribe and solve it.") : t("Готовлю фото…", "Preparing the photo…")}
              </span>
              {photo && <button aria-label={t("Убрать фото", "Remove photo")} onClick={() => setPhoto(null)} className="grid size-8 place-items-center rounded-lg text-fg-3 hover:text-fg"><X className="size-4" /></button>}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-end gap-2">
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
          <motion.button whileTap={{ scale: 0.88 }} aria-label={t("Прикрепить фото задания", "Attach a photo of a task")} disabled={busy || !ready} onClick={() => file.current?.click()}
            className="grid size-[46px] flex-none place-items-center rounded-[14px] border border-line-2 bg-bg text-fg-2 hover:text-fg disabled:opacity-40">
            <Camera className="size-[19px]" strokeWidth={2} />
          </motion.button>
          <textarea ref={ta} rows={1} value={text} placeholder={photo ? t("Вопрос к фото — необязательно", "Question about the photo — optional") : t("Напишите вопрос…", "Type your question…")} disabled={busy}
            onChange={e => { setText(e.target.value); grow(); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer:fine)").matches) { e.preventDefault(); send(text, photo); } }}
            className="field max-h-[140px] resize-none rounded-2xl bg-bg" />
          <motion.button whileTap={{ scale: 0.88 }} aria-label={t("Отправить", "Send")} disabled={busy || preparing || (!text.trim() && !photo)} onClick={() => send(text, photo)}
            className="grid size-[46px] flex-none place-items-center rounded-[14px] bg-accent text-on-accent disabled:opacity-40">
            <ArrowUp className="size-[19px]" strokeWidth={2.2} />
          </motion.button>
        </div>
      </div>
      {chat.length > 0 && !busy && (
        <Button variant="secondary" size="sm" className="mt-1.5" onClick={() => { patch({ chat: [] }); setLive(null); }}>{t("Очистить переписку", "Clear chat")}</Button>
      )}
    </div>
  );
}

function Bubble({ me, text, image, animate }: { me: boolean; text: string; image?: string; animate: boolean }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.92, y: 6 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      style={{ transformOrigin: me ? "100% 100%" : "0 100%" }}
      className={cn("max-w-[88%] lg:max-w-[78%] rounded-2xl px-3.5 py-[11px] text-[14.5px] leading-[1.52] break-words whitespace-pre-wrap",
        me ? "self-end rounded-br-[4px] bg-accent text-on-accent" : "self-start rounded-bl-[4px] bg-bg-2")}
    >
      {image && <img src={image} alt="" className="mb-2 max-h-[220px] w-auto rounded-xl" />}
      {text || <Typing />}
    </motion.div>
  );
}
