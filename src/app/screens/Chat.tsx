import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { useApp, useUI, type ChatMsg } from "@/lib/store";
import { SUBJ_NAME } from "@/lib/data";
import { askAI, aiErrorText, useAiReady } from "@/lib/ai";
import { daysLeft, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Typing } from "@/components/ui/controls";

const SUGG = [
  "Объясни «Смутное время» за 5 минут",
  "Как находить степень окисления?",
  "Составь план на неделю по моим предметам",
  "Чем правоспособность отличается от дееспособности?",
];

export function ChatScreen() {
  const { chat, patch, exam, subjects, examDate } = useApp();
  const ready = useAiReady();
  const [text, setText] = useState("");
  const [live, setLive] = useState<{ text: string; error?: string } | null>(null);
  const busy = !!live && !live.error;
  const ta = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const grow = () => { const t = ta.current; if (t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; } };
  const toBottom = (smooth = true) => bottom.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });

  const send = async (msg: string) => {
    msg = msg.trim();
    if (!msg || busy) return;
    setText(""); setTimeout(grow, 0);
    const history: ChatMsg[] = [...useApp.getState().chat, { role: "user", content: msg }];
    patch({ chat: history });
    setLive({ text: "" });
    setTimeout(() => toBottom(), 30);
    const ctx = `Контекст обо мне: готовлюсь к ${exam}, ${exam === "ОГЭ" ? 9 : 11} класс. Предметы: ${subjects.map(s => SUBJ_NAME[s]).join(", ")}. До экзамена ${daysLeft(examDate)} дн.`;
    try {
      let full = "";
      await askAI([{ role: "user", content: ctx }, ...history.slice(-12)], d => {
        full += d; setLive({ text: full });
        if (innerHeight + scrollY > document.body.scrollHeight - 160) toBottom(false);
      });
      patch({ chat: [...history, { role: "assistant", content: full }] });
      setLive(null);
    } catch (e) {
      setLive({ text: "", error: aiErrorText(e) });
    }
  };

  // «Спросить ИИ» с других экранов приходит сюда через pendingChat
  useEffect(() => {
    const p = useUI.getState().pendingChat;
    if (p) { useUI.setState({ pendingChat: "" }); setTimeout(() => send(p), 350); }
    else if (chat.length) setTimeout(() => toBottom(false), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <AnimatePresence>
        {!chat.length && !live && (
          <motion.div exit={{ opacity: 0, y: -8 }} className="pt-7 pb-2">
            <div className="mb-3.5 flex items-center gap-2 font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
              <b className="font-bold text-fg">ИИ-репетитор</b><span className="h-px w-3.5 bg-line-2" /><span>{ready ? "подключён" : "не подключён"}</span>
            </div>
            <h2 className="mb-1.5 font-display text-2xl font-bold tracking-[-.02em]">Спросите что угодно по подготовке</h2>
            <p className="text-fg-2">Тема кодификатора, формат задания, проверка эссе или разбор ошибки.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGG.map((s, i) => (
                <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => send(s)} disabled={!ready}
                  className="rounded-full border border-line-2 px-3 py-2 text-left text-[13px] text-fg-2 transition-colors hover:border-fg hover:text-fg disabled:opacity-50">{s}</motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2.5 pt-[18px]">
        {chat.map((m, i) => <Bubble key={i} me={m.role === "user"} text={m.content} animate={false} />)}
        {live && (live.error
          ? <div className="hatch rounded-2xl border border-line-2 px-3.5 py-3 text-[13.5px]">{live.error}</div>
          : <Bubble me={false} text={live.text} animate />)}
      </div>

      <div ref={bottom} className="sticky bottom-[calc(74px+env(safe-area-inset-bottom,0px))] z-10 flex items-end gap-2 bg-[linear-gradient(transparent,var(--bg)_30%)] pt-3 pb-1.5">
        <textarea ref={ta} rows={1} value={text} placeholder="Напишите вопрос…" disabled={busy}
          onChange={e => { setText(e.target.value); grow(); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer:fine)").matches) { e.preventDefault(); send(text); } }}
          className="field max-h-[140px] resize-none rounded-2xl bg-bg" />
        <motion.button whileTap={{ scale: 0.88 }} aria-label="Отправить" disabled={busy || !text.trim()} onClick={() => send(text)}
          className="grid size-[46px] flex-none place-items-center rounded-[14px] bg-accent text-on-accent disabled:opacity-40">
          <ArrowUp className="size-[19px]" strokeWidth={2.2} />
        </motion.button>
      </div>
      {chat.length > 0 && !busy && (
        <Button variant="secondary" size="sm" className="mt-1.5" onClick={() => { patch({ chat: [] }); setLive(null); }}>Очистить переписку</Button>
      )}
    </div>
  );
}

function Bubble({ me, text, animate }: { me: boolean; text: string; animate: boolean }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.92, y: 6 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      style={{ transformOrigin: me ? "100% 100%" : "0 100%" }}
      className={cn("max-w-[88%] rounded-2xl px-3.5 py-[11px] text-[14.5px] leading-[1.52] break-words whitespace-pre-wrap",
        me ? "self-end rounded-br-[4px] bg-accent text-on-accent" : "self-start rounded-bl-[4px] bg-bg-2")}
    >
      {text || <Typing />}
    </motion.div>
  );
}
