import { Fragment, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Camera } from "lucide-react";
import { prepareImage } from "@/lib/image";
import { useApp, useUI, defaultSettings, type Settings } from "@/lib/store";
import { ACCENTS, APP_NAME, APP_VERSION, BUILD, PRESETS, subjects as subjectList, subjName, subjNameRu, fipiBankUrl, fipiDemoUrl, sdamUrl, type Provider, type Exam } from "@/lib/data";
import { useT, useLang, isEn, pl, examLabel, type Lang } from "@/lib/i18n";
import { askAI, aiErrorText, photoPrompt, useAiReady, useServer } from "@/lib/ai";
import { applyLook, burst, reveal, shake } from "@/lib/fx";
import { cellStyle, daysLeft, examYear, cn, prettyMath } from "@/lib/utils";
import type { SubjectId } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Chip, Label, Section, Segmented, Switch, Typing, Verdict } from "@/components/ui/controls";
import { disableRemind, enableRemind, type PushFail } from "@/lib/push";
import { Wordmark } from "@/components/Wordmark";
import { Sheet } from "../Shell";
import { weakTopics } from "../screens/Stats";
import { diagSummaryForPlan } from "@/lib/diag";
import { AccountRow, AccountSheet } from "./Account";

const TITLES = {
  settings: ["Настройки", "Settings"], about: ["О проекте", "About"], paste: ["Разобрать задание", "Explain a task"],
  plan: ["План подготовки", "Study plan"], sources: ["Источники заданий", "Task sources"], account: ["Аккаунт", "Account"],
} as const;

export function SheetHost() {
  const sheet = useUI(s => s.sheet);
  const t = useT();
  const close = () => useUI.setState({ sheet: null });
  return (
    <Sheet open={!!sheet} title={sheet ? t(TITLES[sheet][0], TITLES[sheet][1]) : ""} onClose={close}>
      {sheet === "settings" && <SettingsSheet />}
      {sheet === "about" && <AboutSheet />}
      {sheet === "paste" && <PasteSheet />}
      {sheet === "plan" && <PlanSheet />}
      {sheet === "sources" && <SourcesSheet />}
      {sheet === "account" && <AccountSheet />}
    </Sheet>
  );
}

function SrcLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="group flex items-center gap-3 border-t border-line py-[13px] first-of-type:border-0">
      <span className="min-w-0 flex-1"><b className="block text-[14.5px] font-semibold transition-colors group-hover:text-accent">{title}</b><span className="font-mono text-xs text-fg-3">{sub}</span></span>
      <ArrowUpRight className="size-4 text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
    </a>
  );
}

/* ---------- настройки ---------- */
function SettingsSheet() {
  const app = useApp();
  const server = useServer();
  const [exam, setExam] = useState<Exam>(app.exam);
  const [date, setDate] = useState(app.examDate);
  const [subs, setSubs] = useState<Set<SubjectId>>(new Set(app.subjects));
  const [ai, setAi] = useState<Settings>(app.settings.provider === "server" ? { ...app.settings } : app.settings);
  const [test, setTest] = useState<{ kind: "ok" | "bad" | "busy"; text: string } | null>(null);
  const subsRef = useRef<HTMLDivElement>(null);
  const testRef = useRef<HTMLDivElement>(null);
  const own = ai.provider !== "server";
  const t = useT();
  const lang = useLang(s => s.lang);
  const setLang = useLang(s => s.setLang);

  const center = (el: Element) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] as const; };

  const saveAll = () => {
    if (!subs.size) { shake(subsRef.current); return; }
    app.patch({ exam, examDate: date || app.examDate, subjects: [...subs], settings: ai });
    useUI.setState({ sheet: null });
  };
  const runTest = async () => {
    setTest({ kind: "busy", text: "" });
    try {
      let got = "";
      await askAI([{ role: "user", content: isEn() ? "Reply with one word: working" : "Ответь одним словом: работает" }], d => { got += d; }, undefined, ai);
      setTest({ kind: "ok", text: got.slice(0, 80) });
      setTimeout(() => burst(testRef.current?.querySelector("[data-vi]") || null), 50);
    } catch (e) {
      setTest({ kind: "bad", text: aiErrorText(e) });
      setTimeout(() => shake(testRef.current), 50);
    }
  };

  return (
    <div className="pb-2">
      <Section>{t("Аккаунт", "Account")}</Section>
      <AccountRow onOpen={() => useUI.setState({ sheet: "account" })} />

      <Section>{t("Язык", "Language")}</Section>
      <Segmented id="lang" value={lang} items={[["ru", "Русский"], ["en", "English"]] as [Lang, string][]} onChange={v => setLang(v)} />

      <Section>{t("Внешний вид", "Appearance")}</Section>
      <Label>{t("Тема", "Theme")}</Label>
      <Segmented id="theme" value={app.theme || "system"} items={[["system", t("Системная", "System")], ["light", t("Светлая", "Light")], ["dark", t("Тёмная", "Dark")]]}
        onChange={(v, el) => { const [x, y] = center(el); reveal(x, y, () => { const t = v === "system" ? "" : v; app.patch({ theme: t }); applyLook(t, app.accent); }); }} />
      <Label className="mt-[18px]">{t("Акцентный цвет", "Accent colour")}</Label>
      <div className="flex flex-wrap gap-2.5">
        {ACCENTS.map(a => (
          <motion.button key={a.id} whileTap={{ scale: 0.9 }} aria-label={t(a.name, a.en)} aria-pressed={app.accent === a.id}
            onClick={e => { const [x, y] = center(e.currentTarget); reveal(x, y, () => { app.patch({ accent: a.id }); applyLook(app.theme, a.id); }); }}
            className={cn("grid size-11 place-items-center rounded-xl border bg-bg", app.accent === a.id ? "border-fg shadow-[inset_0_0_0_2px_var(--fg)]" : "border-line-2")}>
            <i className="block size-[26px] rounded-lg" style={{ background: a.color }} />
          </motion.button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[12px] text-fg-3">{(() => { const a = ACCENTS.find(a => a.id === app.accent); return a ? t(a.name, a.en) : ""; })()}</p>

      <RemindBlock />

      <Section>{t("Экзамен", "Exam")}</Section>
      <Segmented id="exam" value={exam} items={[["ЕГЭ", t("ЕГЭ · 11 класс", "EGE · grade 11")], ["ОГЭ", t("ОГЭ · 9 класс", "OGE · grade 9")]]} onChange={v => setExam(v)} />
      <label className="mt-4 block"><Label>{t("Дата первого экзамена", "Date of your first exam")}</Label><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></label>
      <Label className="mt-4">{t("Предметы", "Subjects")}</Label>
      <div ref={subsRef} className="flex flex-wrap gap-2">
        {subjectList().map(s => <Chip key={s.id} pressed={subs.has(s.id)} onClick={() => { const n = new Set(subs); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setSubs(n); }}>{s.short}</Chip>)}
      </div>

      <Section>{t("Искусственный интеллект", "Artificial intelligence")}</Section>
      <label className="block"><Label>{t("Сервис", "Service")}</Label>
        <select className="field" value={ai.provider} onChange={e => {
          const p = e.target.value as Provider;
          setAi(p === "server" ? { ...defaultSettings(), key: ai.key } : { provider: p, base: PRESETS[p].base || ai.base, model: PRESETS[p].model || ai.model, key: ai.key });
          setTest(null);
        }}>
          {(Object.keys(PRESETS) as Provider[]).map(k => <option key={k} value={k}>{t(PRESETS[k].label, PRESETS[k].en)}</option>)}
        </select>
      </label>
      {!own ? (
        <p className="mt-2 text-[12.5px] leading-snug text-fg-3">
          {server.state === "ok" ? t(`Сервер подключён${server.model ? " · модель " + server.model : ""}. Ключ хранится на сервере, вводить ничего не нужно.`, `Server connected${server.model ? " · model " + server.model : ""}. The key is stored on the server — nothing to enter.`)
            : server.state === "off" ? t("Сервер ИИ недоступен. Можно выбрать другой сервис и указать свой ключ.", "The AI server is unavailable. You can pick another service and enter your own key.") : t("Проверяю сервер…", "Checking the server…")}
        </p>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          <label className="mt-4 block"><Label>{t("Адрес API", "API URL")}</Label><input className="field" value={ai.base} spellCheck={false} onChange={e => setAi({ ...ai, base: e.target.value.trim() })} placeholder="https://openrouter.ai/api/v1" /></label>
          <label className="mt-4 block"><Label>{t("Модель", "Model")}</Label><input className="field" value={ai.model} spellCheck={false} onChange={e => setAi({ ...ai, model: e.target.value.trim() })} placeholder="openrouter/free" /></label>
          <label className="mt-4 block"><Label>{t("Ключ API", "API key")}</Label><input className="field" type="password" autoComplete="off" value={ai.key} spellCheck={false} onChange={e => setAi({ ...ai, key: e.target.value.trim() })} placeholder="sk-or-v1-…" /></label>
          <p className="mt-2 text-[12.5px] text-fg-3">{t("Ключ хранится только на этом устройстве. Бесплатный ключ: odirouter.ai или openrouter.ai.", "The key is stored only on this device. Free keys: odirouter.ai or openrouter.ai.")}</p>
        </motion.div>
      )}
      <Button variant="outline" className="mt-3 w-full" onClick={runTest} disabled={test?.kind === "busy"}>{t("Проверить подключение", "Test connection")}</Button>
      <div ref={testRef}>
        {test?.kind === "busy" && <div className="mt-2.5"><Typing /></div>}
        {test?.kind === "ok" && <Verdict kind="ok" title={t("Подключение работает", "Connection works")}>{t("Ответ модели", "Model reply")}: {test.text}</Verdict>}
        {test?.kind === "bad" && <Verdict kind="bad" title={t("Не получилось", "That didn't work")}>{test.text}</Verdict>}
      </div>

      <Button className="mt-6 w-full" onClick={saveAll}>{t("Сохранить", "Save")}</Button>

      <Section>{t("Ещё", "More")}</Section>
      <div className="grid gap-2">
        {[
          [t("О проекте", "About the project"), t("цель, возможности, технологии", "purpose, features, technology"), () => useUI.setState({ sheet: "about" })],
          [t("Источники заданий", "Task sources"), t("ФИПИ и Сдам ГИА по вашим предметам", "FIPI and Sdam GIA for your subjects"), () => useUI.setState({ sheet: "sources" })],
          [t("Показать заставку", "Show intro screen"), t("титульный экран с логотипом", "the title screen with the logo"), () => { app.patch({ onboarded: false }); useUI.setState({ sheet: null, onbStep: 0 }); }],
        ].map(([t, s, fn]) => (
          <button key={t as string} onClick={fn as () => void} className="group flex items-center gap-3.5 rounded-[14px] border border-line px-4 py-3.5 text-left hover:border-fg">
            <span className="flex-1"><b className="block text-[15px]">{t as string}</b><span className="text-[12.5px] text-fg-3">{s as string}</span></span>
            <ArrowRight className="size-[18px] text-fg-3 transition-transform group-hover:translate-x-1 group-hover:text-fg" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- напоминания ---------- */
function RemindBlock() {
  const remind = useApp(s => s.remind);
  const patch = useApp(s => s.patch);
  const lang = useLang(s => s.lang);
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const NOTES: Record<PushFail, [string, string]> = {
    "ios-install": ["На iPhone напоминания работают, когда HUNDO установлен на главный экран: Safari → «Поделиться» → «На экран „Домой“». Потом включите их здесь.", "On iPhone reminders work once HUNDO is on your home screen: Safari → Share → Add to Home Screen. Then turn them on here."],
    unsupported: ["Этот браузер не поддерживает уведомления. Попробуйте Chrome или установите приложение.", "This browser doesn't support notifications. Try Chrome or install the app."],
    server: ["Сервер напоминаний пока не настроен. Автору: подключите базу Upstash for Redis в Vercel → Storage.", "The reminder server isn't set up yet. Author: connect an Upstash for Redis database in Vercel → Storage."],
    denied: ["Уведомления запрещены. Разрешите их в настройках браузера или телефона для этого сайта.", "Notifications are blocked. Allow them for this site in your browser or phone settings."],
    error: ["Не получилось включить напоминания. Попробуйте ещё раз.", "Couldn't turn on reminders. Please try again."],
  };
  const toggle = async (on: boolean) => {
    setBusy(true); setNote("");
    if (on) {
      const r = await enableRemind(lang);
      if (r.ok) patch({ remind: true });
      else setNote(t(...NOTES[r.reason]));
    } else { await disableRemind(); patch({ remind: false }); }
    setBusy(false);
  };
  return (
    <>
      <Section>{t("Напоминания", "Reminders")}</Section>
      <div className={busy ? "pointer-events-none opacity-60" : ""}>
        <Switch checked={remind} onChange={toggle}>{t("Напомнить в 18:00, если я 2 дня не занимался", "Remind me at 6 pm if I skip 2 days")}</Switch>
      </div>
      {note && <p className="mt-2 text-[12.5px] leading-snug text-fg-2">{note}</p>}
    </>
  );
}

/* ---------- о проекте ---------- */
function AboutSheet() {
  const t = useT();
  const [share, setShare] = useState("");
  const onShare = async () => {
    const url = location.origin + "/";
    if (navigator.share) { try { await navigator.share({ title: "HUNDO", text: t("ИИ-помощник для подготовки к ЕГЭ и ОГЭ", "AI tutor for the Russian state exams EGE and OGE"), url }); return; } catch (e) { if ((e as Error).name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); setShare(t("Ссылка скопирована: ", "Link copied: ") + url); } catch { setShare(url); }
  };
  const features: [string, string][] = [
    [t("Варианты от ИИ", "AI mock exams"), t("5–15 заданий в формате ФИПИ, проверка и оценка части 2 по критериям", "5–15 tasks in the FIPI format, auto-marking and Part 2 graded against criteria")],
    [t("Разбор любого задания", "Explain any task"), t("вставил условие — получил решение по шагам", "paste a task, get a step-by-step solution")],
    [t("Тренажёр", "Practice"), t("76 заданий с разборами, поле ответа как в бланке", "76 tasks with solutions and an answer field like the real form")],
    [t("Прогресс", "Progress"), t("точность по предметам, серия дней, темы на повторение", "accuracy by subject, day streak, topics to review")],
    [t("План подготовки", "Study plan"), t("персональный план по неделям до даты экзамена", "a personal week-by-week plan up to the exam date")],
    [t("Фото задания", "Photo of a task"), t("сфотографировал задачу из учебника — ИИ переписал условие и решил по шагам", "snap a task from a textbook — the AI transcribes and solves it step by step")],
    [t("Режим экзамена", "Exam mode"), t("таймер, автосдача по окончании времени, примерный тестовый балл", "a timer, automatic hand-in when time is up, an estimated test score")],
    [t("Карточки", "Flashcards"), t("98 карточек: даты, термины, формулы; интервальное повторение", "98 cards: dates, terms, formulas; spaced repetition")],
    [t("Напоминания", "Reminders"), t("push-уведомление, если 2 дня не занимался", "a push notification if you skip 2 days")],
    [t("Два языка и компьютер", "Two languages and desktop"), t("русский и английский интерфейс, отдельная раскладка для ПК", "Russian and English interface, a dedicated desktop layout")],
  ];
  const tech: [string, string][] = [
    [t("Интерфейс", "Interface"), t("React 19, TypeScript, Tailwind CSS 4, анимации Motion, компоненты Magic UI и shadcn/ui из каталога 21st.dev", "React 19, TypeScript, Tailwind CSS 4, Motion animations, Magic UI and shadcn/ui components from the 21st.dev catalogue")],
    [t("Дизайн", "Design"), t("монохромный минимализм по рекомендациям UI/UX Pro Max, акцентный цвет на выбор", "monochrome minimalism following UI/UX Pro Max guidance, with a choice of accent colour")],
    [t("Формат", "Format"), t("PWA — ставится на iPhone и Android с главного экрана, работает без магазина приложений", "PWA — installs on iPhone and Android from the home screen, no app store needed")],
    [t("Офлайн", "Offline"), t("service worker (Workbox) кэширует приложение; без сети работают тренажёр и статистика", "a service worker (Workbox) caches the app; practice and stats work without a connection")],
    [t("ИИ", "AI"), t("серверная функция на Vercel передаёт запросы в OdiRouter (бесплатная модель Gemini 2.5 Flash), ключ хранится на сервере; ответ приходит потоком", "a Vercel server function forwards requests to OdiRouter (free Gemini 2.5 Flash model); the key stays on the server and replies stream in")],
    [t("Обновления", "Updates"), t("каждое изменение в GitHub автоматически выкладывается на Vercel, приложение само предлагает обновиться", "every change pushed to GitHub deploys to Vercel automatically, and the app offers to update itself")],
    [t("Данные", "Data"), t("хранятся только на устройстве (localStorage)", "stored only on the device (localStorage)")],
  ];
  return (
    <div className="pb-2">
      <Wordmark text={APP_NAME} className="mt-2 mb-1" />
      <div className="mt-1.5 mb-4 flex justify-between gap-2.5 font-mono text-[11.5px] tracking-[.1em] text-fg-3 uppercase">
        <span>{t("ИИ-помощник по ЕГЭ и ОГЭ", "AI tutor for EGE & OGE")}</span><span>v{APP_VERSION}{BUILD.version.startsWith("local") ? "" : " · " + BUILD.version}</span>
      </div>
      <Button className="w-full" onClick={onShare}>{t("Поделиться ссылкой на установку", "Share the install link")} <ArrowRight /></Button>
      {share && <p className="mt-2 text-[12.5px] text-fg-3">{share}</p>}

      <Section>{t("Название", "The name")}</Section>
      <p className="m-0"><b>HUNDO</b>{t(" — «сотка» на английском сленге, то есть 100 баллов. Цель, к которой приложение ведёт ученика.", " is slang for a hundred — 100 points, the top score on the exam. That's the goal the app leads the student to.")}</p>

      <Section>{t("Зачем", "Why")}</Section>
      <p className="m-0">{t("Готовиться к экзамену одному трудно: задания есть в банке ФИПИ и на «Сдам ГИА», но никто не объясняет, почему ответ неверный. Репетитор стоит дорого. HUNDO даёт ученику репетитора в телефоне: он составляет варианты, проверяет ответы, разбирает каждую ошибку и следит за слабыми темами.",
        "Preparing for the exam alone is hard: there are tasks in the FIPI bank and on Sdam GIA, but nobody explains why an answer is wrong, and a tutor is expensive. HUNDO puts a tutor in the student's phone: it writes mock exams, checks answers, explains every mistake and keeps track of weak topics.")}</p>

      <Section>{t("Что умеет", "What it does")}</Section>
      {features.map(([t, s]) => (
        <div key={t} className="border-t border-line py-3 first-of-type:border-0"><b className="block text-[14.5px] font-medium">{t}</b><small className="text-xs text-fg-3">{s}</small></div>
      ))}

      <Section>{t("Как устроено", "How it's built")}</Section>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
        {tech.map(([t, d]) => <Fragment key={t}><dt className="pt-0.5 font-mono text-[12px] tracking-[.06em] text-fg-3 uppercase">{t}</dt><dd className="m-0">{d}</dd></Fragment>)}
      </dl>

      <Section>{t("Источники", "Sources")}</Section>
      <SrcLink href="https://fipi.ru/" title={t("ФИПИ", "FIPI")} sub={t("кодификаторы, демоверсии, открытый банк", "codifiers, demo papers, open task bank")} />
      <SrcLink href="https://ege.sdamgia.ru/" title={t("Сдам ГИА: ЕГЭ", "Sdam GIA: EGE")} sub={t("каталог заданий", "task catalogue")} />
      <SrcLink href="https://oge.sdamgia.ru/" title={t("Сдам ГИА: ОГЭ", "Sdam GIA: OGE")} sub={t("каталог заданий", "task catalogue")} />
      {BUILD.date && <p className="mt-3 text-[12.5px] text-fg-3">{t("Сборка", "Build")} {BUILD.version} {t("от", "·")} {BUILD.date}{BUILD.message ? ": " + BUILD.message : ""}</p>}
    </div>
  );
}

/* ---------- разбор задания ---------- */
function PasteSheet() {
  const { subjects, exam } = useApp();
  const askInChat = useUI(s => s.askInChat);
  const ready = useAiReady();
  const [subj, setSubj] = useState(subjects[0]);
  const [task, setTask] = useState("");
  const [ans, setAns] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const t = useT();
  const onPhoto = async (f?: File) => {
    if (!f) return;
    setPhotoBusy(true); setPhotoErr("");
    try {
      const { image, thumb } = await prepareImage(f);
      askInChat(photoPrompt(exam, subjNameRu(subj) + (isEn() ? ` (${subjName(subj)})` : ""), ans.trim() || undefined), image, thumb,
        t(`Разбери задание с фото · ${subjName(subj)}`, `Explain the task in the photo · ${subjName(subj)}`) + (ans.trim() ? t(`\nМой ответ: ${ans.trim()}`, `\nMy answer: ${ans.trim()}`) : ""));
    } catch { setPhotoErr(t("Не получилось открыть фото. Попробуйте другой снимок.", "Couldn't open the photo. Try another one.")); }
    finally { setPhotoBusy(false); if (file.current) file.current.value = ""; }
  };
  return (
    <div className="pb-2">
      <Label>{t("Предмет", "Subject")}</Label>
      <div className="mb-4 flex flex-wrap gap-2">{subjects.map(id => <Chip key={id} pressed={id === subj} onClick={() => setSubj(id)}>{subjName(id)}</Chip>)}</div>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={e => onPhoto(e.target.files?.[0])} />
      <motion.button whileTap={{ scale: 0.98 }} disabled={!ready || photoBusy} onClick={() => file.current?.click()}
        className="flex w-full items-center gap-4 rounded-[16px] bg-accent px-5 py-5 text-left text-on-accent disabled:opacity-50">
        <span className="grid size-12 flex-none place-items-center rounded-xl bg-on-accent/15"><Camera className="size-6" /></span>
        <span className="min-w-0 flex-1">
          <b className="block text-[16px]">{photoBusy ? t("Готовлю фото…", "Preparing the photo…") : t("Сфотографировать задание", "Take a photo of a task")}</b>
          <span className="text-[12.5px] opacity-75">{t("учебник, сборник или экран — ИИ перепишет условие и решит", "a textbook, workbook or screen — the AI transcribes and solves it")}</span>
        </span>
      </motion.button>
      {photoErr && <p className="mt-2 text-[12.5px] text-fg-2">{photoErr}</p>}
      <div className="my-5 flex items-center gap-3 font-mono text-[12px] tracking-[.12em] text-fg-3 uppercase after:h-px after:flex-1 after:bg-line before:h-px before:flex-1 before:bg-line">{t("или текстом", "or as text")}</div>
      <p className="mb-[18px] text-[13px] text-fg-2">{t("Скопируйте условие с ", "Copy a task from ")}<a className="link-u text-fg" href={sdamUrl(subjects[0] || "hist", exam)} target="_blank" rel="noopener">{t("Сдам ГИА", "Sdam GIA")}</a>{t(", из банка ФИПИ или сборника — ИИ решит его по шагам и объяснит, как решать такие задания.", ", the FIPI bank or a workbook — the AI solves it step by step and explains how to approach tasks like it.")}</p>
      <label className="block"><Label>{t("Условие задания", "Task text")}</Label><textarea ref={ta} className="field" rows={7} value={task} onChange={e => setTask(e.target.value)} placeholder={t("Вставьте текст задания", "Paste the task here")} /></label>
      <label className="mt-4 block"><Label>{t("Ваш ответ — необязательно", "Your answer — optional")}</Label><input className="cells" style={cellStyle(ans.length)} value={ans} onChange={e => setAns(e.target.value)} placeholder={t("Если уже решали — ИИ проверит", "Solved it already? The AI will check")} /></label>
      <Button className="mt-4 w-full" disabled={!ready} onClick={() => {
        if (!task.trim()) { shake(ta.current); ta.current?.focus(); return; }
        askInChat(isEn()
          ? `Go through this ${examLabel(exam)} task in ${subjName(subj)} (${subjNameRu(subj)}).\n\n${task.trim()}\n\n${ans.trim() ? "My answer: " + ans.trim() + ". Check it and explain the mistake if there is one." : "Solve it step by step and explain how to approach tasks like this."}\nName the codifier topic the task belongs to.`
          : `Разбери задание ${exam} по предмету «${subjNameRu(subj)}».\n\n${task.trim()}\n\n${ans.trim() ? "Мой ответ: " + ans.trim() + ". Проверь его и объясни ошибку, если она есть." : "Реши по шагам и объясни, как решать такие задания."}\nНазови тему по кодификатору, к которой относится задание.`);
      }}>{ready ? <>{t("Разобрать", "Explain it")} <ArrowRight /></> : t("ИИ не подключён — см. настройки", "AI not connected — see Settings")}</Button>
    </div>
  );
}

/* ---------- план ---------- */
function PlanSheet() {
  const state = useApp();
  const ready = useAiReady();
  const d = daysLeft(state.examDate) ?? 0, weeks = Math.max(1, Math.round(d / 7)), per = state.subjects.length || 1;
  const [plan, setPlan] = useState<{ text: string; busy: boolean } | null>(null);
  const t = useT();
  const gen = async () => {
    setPlan({ text: "", busy: true });
    const weak = weakTopics(state).map(w => `${subjName(w.subj)}: ${w.topic}`).join("; ") || t("пока не определены", "not identified yet");
    const diagLine = diagSummaryForPlan(state.diag);
    try {
      await askAI([{ role: "user", content: isEn() ? `Make a study plan for the ${examLabel(state.exam)} (Russian state exam).
Subjects: ${state.subjects.map(s => subjName(s)).join(", ")}.
${d} days until the exam.
Weak topics from the trainer: ${weak}.
${diagLine ? `Diagnostic test results: ${diagLine}. Spend more time on subjects with a lower level and start with the weak topics.\n` : ""}
Give a week-by-week plan: what to study, how many tasks to solve, when to sit mock exams. 250 words max, a plain list, no introduction, in English.` : `Составь план подготовки к ${state.exam}.
Предметы: ${state.subjects.map(s => subjName(s)).join(", ")}.
До экзамена ${d} дней.
Слабые темы по результатам тренажёра: ${weak}.
${diagLine ? `Результаты диагностики: ${diagLine}. Больше времени отдай предметам с низким уровнем, начинай со слабых тем.\n` : ""}
Дай план по неделям: что изучать, сколько заданий решать, когда писать пробники. Максимум 250 слов, простым списком, без вступления.` }],
        piece => setPlan(p => ({ text: (p?.text || "") + piece, busy: true })));
      setPlan(p => ({ text: p?.text || "", busy: false }));
    } catch (e) { setPlan({ text: aiErrorText(e), busy: false }); }
  };
  return (
    <div className="pb-2">
      <div className="grid grid-cols-[auto_1fr] items-end gap-x-[18px] gap-y-1 pt-1">
        <div className="row-span-2 font-display text-[88px] leading-[.82] font-black tracking-[-.05em]">{weeks}</div>
        <div className="text-[15px] leading-tight font-semibold">{pl(weeks, ["неделя", "недели", "недель"], ["week", "weeks"])}<br />{t("до", "until")} {examLabel(state.exam)}</div>
        <div className="font-mono text-xs text-fg-3">{per} {pl(per, ["предмет", "предмета", "предметов"], ["subject", "subjects"])}</div>
      </div>
      <Section>{t("Базовая неделя", "A typical week")}</Section>
      {([[t("Теория и конспект", "Theory and notes"), t("2 дня", "2 days")], [t("Задания части 1", "Part 1 tasks"), t("3 дня", "3 days")], [t("Задания части 2", "Part 2 tasks"), t("1 день", "1 day")], [t("Разбор ошибок", "Reviewing mistakes"), t("1 день", "1 day")]] as const).map(([a, b]) => (
        <div key={a} className="flex items-center gap-3 border-t border-line py-3 first-of-type:border-0">
          <span className="flex-1 text-[14.5px] font-medium">{a}</span>
          <span className="rounded-[5px] border border-line-2 px-[7px] py-[3px] font-mono text-[11.5px] tracking-[.06em] text-fg-2 uppercase">{b}</span>
        </div>
      ))}
      <Button className="mt-[18px] w-full" disabled={!ready || !!plan?.busy} onClick={gen}>{ready ? <>{t("Персональный план от ИИ", "Personal plan from the AI")} <ArrowRight /></> : t("ИИ не подключён — см. настройки", "AI not connected — see Settings")}</Button>
      {plan && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3.5 rounded-xl bg-bg-2 px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap text-fg-2">
          <Label className="mb-1.5">{t("План от ИИ", "AI plan")}</Label>{prettyMath(plan.text) || <Typing />}
        </motion.div>
      )}
    </div>
  );
}

/* ---------- источники ---------- */
function SourcesSheet() {
  const { subjects, exam } = useApp();
  const t = useT();
  return (
    <div className="pb-2">
      {t.en && <p className="mb-3 text-[12.5px] text-fg-3">These are the official Russian sources — the sites themselves are in Russian.</p>}
      {subjects.map(id => <SrcLink key={id} href={sdamUrl(id, exam)} title={subjName(id)} sub={`${t("Сдам ГИА", "Sdam GIA")} · ${examLabel(exam)}`} />)}
      <SrcLink href={fipiBankUrl(exam)} title={t("Открытый банк заданий ФИПИ", "FIPI open task bank")} sub={t("официальные задания", "official tasks")} />
      <SrcLink href={fipiDemoUrl(exam)} title={t("Демоверсии и кодификаторы", "Demo papers and codifiers")} sub={`${t("ФИПИ", "FIPI")} · ${examYear()}`} />
      <p className="mt-2 text-[12.5px] text-fg-3">{t("Нашли задание на сайте? Скопируйте условие и нажмите «Разобрать задание» на главной.", "Found a task on one of these sites? Copy it and press “Explain a task” on Home.")}</p>
    </div>
  );
}
