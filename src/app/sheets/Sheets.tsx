import { Fragment, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useApp, useUI, defaultSettings, type Settings } from "@/lib/store";
import { ACCENTS, APP_NAME, APP_VERSION, BUILD, PRESETS, SUBJECTS, SUBJ_NAME, fipiBankUrl, fipiDemoUrl, sdamUrl, type Provider, type Exam } from "@/lib/data";
import { askAI, aiErrorText, useAiReady, useServer } from "@/lib/ai";
import { applyLook, burst, reveal, shake } from "@/lib/fx";
import { cellStyle, daysLeft, examYear, plural, cn } from "@/lib/utils";
import type { SubjectId } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Chip, Label, Section, Segmented, Typing, Verdict } from "@/components/ui/controls";
import { Wordmark } from "@/components/Wordmark";
import { Sheet } from "../Shell";
import { weakTopics } from "../screens/Stats";

const TITLES = { settings: "Настройки", about: "О проекте", paste: "Разобрать задание", plan: "План подготовки", sources: "Источники заданий" } as const;

export function SheetHost() {
  const sheet = useUI(s => s.sheet);
  const close = () => useUI.setState({ sheet: null });
  return (
    <Sheet open={!!sheet} title={sheet ? TITLES[sheet] : ""} onClose={close}>
      {sheet === "settings" && <SettingsSheet />}
      {sheet === "about" && <AboutSheet />}
      {sheet === "paste" && <PasteSheet />}
      {sheet === "plan" && <PlanSheet />}
      {sheet === "sources" && <SourcesSheet />}
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
      await askAI([{ role: "user", content: "Ответь одним словом: работает" }], d => { got += d; }, undefined, ai);
      setTest({ kind: "ok", text: got.slice(0, 80) });
      setTimeout(() => burst(testRef.current?.querySelector("[data-vi]") || null), 50);
    } catch (e) {
      setTest({ kind: "bad", text: aiErrorText(e) });
      setTimeout(() => shake(testRef.current), 50);
    }
  };

  return (
    <div className="pb-2">
      <Section>Внешний вид</Section>
      <Label>Тема</Label>
      <Segmented id="theme" value={app.theme || "system"} items={[["system", "Системная"], ["light", "Светлая"], ["dark", "Тёмная"]]}
        onChange={(v, el) => { const [x, y] = center(el); reveal(x, y, () => { const t = v === "system" ? "" : v; app.patch({ theme: t }); applyLook(t, app.accent); }); }} />
      <Label className="mt-[18px]">Акцентный цвет</Label>
      <div className="flex flex-wrap gap-2.5">
        {ACCENTS.map(a => (
          <motion.button key={a.id} whileTap={{ scale: 0.9 }} aria-label={a.name} aria-pressed={app.accent === a.id}
            onClick={e => { const [x, y] = center(e.currentTarget); reveal(x, y, () => { app.patch({ accent: a.id }); applyLook(app.theme, a.id); }); }}
            className={cn("grid size-11 place-items-center rounded-xl border bg-bg", app.accent === a.id ? "border-fg shadow-[inset_0_0_0_2px_var(--fg)]" : "border-line-2")}>
            <i className="block size-[26px] rounded-lg" style={{ background: a.color }} />
          </motion.button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-fg-3">{ACCENTS.find(a => a.id === app.accent)?.name}</p>

      <Section>Экзамен</Section>
      <Segmented id="exam" value={exam} items={[["ЕГЭ", "ЕГЭ · 11 класс"], ["ОГЭ", "ОГЭ · 9 класс"]]} onChange={v => setExam(v)} />
      <label className="mt-4 block"><Label>Дата первого экзамена</Label><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></label>
      <Label className="mt-4">Предметы</Label>
      <div ref={subsRef} className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => <Chip key={s.id} pressed={subs.has(s.id)} onClick={() => { const n = new Set(subs); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setSubs(n); }}>{s.short}</Chip>)}
      </div>

      <Section>Искусственный интеллект</Section>
      <label className="block"><Label>Сервис</Label>
        <select className="field" value={ai.provider} onChange={e => {
          const p = e.target.value as Provider;
          setAi(p === "server" ? { ...defaultSettings(), key: ai.key } : { provider: p, base: PRESETS[p].base || ai.base, model: PRESETS[p].model || ai.model, key: ai.key });
          setTest(null);
        }}>
          {(Object.keys(PRESETS) as Provider[]).map(k => <option key={k} value={k}>{PRESETS[k].label}</option>)}
        </select>
      </label>
      {!own ? (
        <p className="mt-2 text-[12.5px] leading-snug text-fg-3">
          {server.state === "ok" ? `Сервер подключён${server.model ? " · модель " + server.model : ""}. Ключ хранится на сервере, вводить ничего не нужно.`
            : server.state === "off" ? "Сервер ИИ недоступен. Можно выбрать другой сервис и указать свой ключ." : "Проверяю сервер…"}
        </p>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
          <label className="mt-4 block"><Label>Адрес API</Label><input className="field" value={ai.base} spellCheck={false} onChange={e => setAi({ ...ai, base: e.target.value.trim() })} placeholder="https://openrouter.ai/api/v1" /></label>
          <label className="mt-4 block"><Label>Модель</Label><input className="field" value={ai.model} spellCheck={false} onChange={e => setAi({ ...ai, model: e.target.value.trim() })} placeholder="openrouter/free" /></label>
          <label className="mt-4 block"><Label>Ключ API</Label><input className="field" type="password" autoComplete="off" value={ai.key} spellCheck={false} onChange={e => setAi({ ...ai, key: e.target.value.trim() })} placeholder="sk-or-v1-…" /></label>
          <p className="mt-2 text-[12.5px] text-fg-3">Ключ хранится только на этом устройстве. Бесплатный ключ: openrouter.ai → Keys → Create Key.</p>
        </motion.div>
      )}
      <Button variant="outline" className="mt-3 w-full" onClick={runTest} disabled={test?.kind === "busy"}>Проверить подключение</Button>
      <div ref={testRef}>
        {test?.kind === "busy" && <div className="mt-2.5"><Typing /></div>}
        {test?.kind === "ok" && <Verdict kind="ok" title="Подключение работает">Ответ модели: {test.text}</Verdict>}
        {test?.kind === "bad" && <Verdict kind="bad" title="Не получилось">{test.text}</Verdict>}
      </div>

      <Button className="mt-6 w-full" onClick={saveAll}>Сохранить</Button>

      <Section>Ещё</Section>
      <div className="grid gap-2">
        {[
          ["О проекте", "цель, возможности, технологии", () => useUI.setState({ sheet: "about" })],
          ["Показать заставку", "титульный экран с логотипом", () => { app.patch({ onboarded: false }); useUI.setState({ sheet: null, onbStep: 0 }); }],
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

/* ---------- о проекте ---------- */
function AboutSheet() {
  const [share, setShare] = useState("");
  const onShare = async () => {
    const url = location.origin + "/";
    if (navigator.share) { try { await navigator.share({ title: "Сотка", text: "ИИ-помощник для подготовки к ЕГЭ и ОГЭ", url }); return; } catch (e) { if ((e as Error).name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); setShare("Ссылка скопирована: " + url); } catch { setShare(url); }
  };
  const features: [string, string][] = [
    ["Варианты от ИИ", "5–15 заданий в формате ФИПИ, проверка и оценка части 2 по критериям"],
    ["Разбор любого задания", "вставил условие — получил решение по шагам"],
    ["Тренажёр", "банк заданий с разборами, поле ответа как в бланке"],
    ["Прогресс", "точность по предметам, серия дней, темы на повторение"],
    ["План подготовки", "персональный план по неделям до даты экзамена"],
  ];
  const tech: [string, string][] = [
    ["Интерфейс", "React 19, TypeScript, Tailwind CSS 4, анимации Motion, компоненты Magic UI и shadcn/ui из каталога 21st.dev"],
    ["Дизайн", "монохромный минимализм по рекомендациям UI/UX Pro Max, акцентный цвет на выбор"],
    ["Формат", "PWA — ставится на iPhone и Android с главного экрана, работает без магазина приложений"],
    ["Офлайн", "service worker (Workbox) кэширует приложение; без сети работают тренажёр и статистика"],
    ["ИИ", "серверная функция на Vercel передаёт запросы в OpenRouter, ключ хранится на сервере; ответ приходит потоком"],
    ["Обновления", "каждое изменение в GitHub автоматически выкладывается на Vercel, приложение само предлагает обновиться"],
    ["Данные", "хранятся только на устройстве (localStorage)"],
  ];
  return (
    <div className="pb-2">
      <Wordmark text={APP_NAME} className="mt-2 mb-1" />
      <div className="mt-1.5 mb-4 flex justify-between gap-2.5 font-mono text-[10.5px] tracking-[.1em] text-fg-3 uppercase">
        <span>ИИ-помощник по ЕГЭ и ОГЭ</span><span>v{APP_VERSION}{BUILD.version.startsWith("local") ? "" : " · " + BUILD.version}</span>
      </div>
      <Button className="w-full" onClick={onShare}>Поделиться ссылкой на установку <ArrowRight /></Button>
      {share && <p className="mt-2 text-[12.5px] text-fg-3">{share}</p>}

      <Section>Зачем</Section>
      <p className="m-0">Готовиться к экзамену одному трудно: задания есть в банке ФИПИ и на «Сдам ГИА», но никто не объясняет, почему ответ неверный. Репетитор стоит дорого. «Сотка» даёт ученику репетитора в телефоне: он составляет варианты, проверяет ответы, разбирает каждую ошибку и следит за слабыми темами.</p>

      <Section>Что умеет</Section>
      {features.map(([t, s]) => (
        <div key={t} className="border-t border-line py-3 first-of-type:border-0"><b className="block text-[14.5px] font-medium">{t}</b><small className="text-xs text-fg-3">{s}</small></div>
      ))}

      <Section>Как устроено</Section>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
        {tech.map(([t, d]) => <Fragment key={t}><dt className="pt-0.5 font-mono text-[11px] tracking-[.06em] text-fg-3 uppercase">{t}</dt><dd className="m-0">{d}</dd></Fragment>)}
      </dl>

      <Section>Источники</Section>
      <SrcLink href="https://fipi.ru/" title="ФИПИ" sub="кодификаторы, демоверсии, открытый банк" />
      <SrcLink href="https://ege.sdamgia.ru/" title="Сдам ГИА: ЕГЭ" sub="каталог заданий" />
      <SrcLink href="https://oge.sdamgia.ru/" title="Сдам ГИА: ОГЭ" sub="каталог заданий" />
      {BUILD.date && <p className="mt-3 text-[12.5px] text-fg-3">Сборка {BUILD.version} от {BUILD.date}{BUILD.message ? ": " + BUILD.message : ""}</p>}
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
  return (
    <div className="pb-2">
      <p className="mt-1 mb-[18px] text-[13px] text-fg-2">Скопируйте условие с <a className="link-u text-fg" href={sdamUrl(subjects[0] || "hist", exam)} target="_blank" rel="noopener">Сдам ГИА</a>, из банка ФИПИ или сборника — ИИ решит его по шагам и объяснит, как решать такие задания.</p>
      <Label>Предмет</Label>
      <div className="mb-4 flex flex-wrap gap-2">{subjects.map(id => <Chip key={id} pressed={id === subj} onClick={() => setSubj(id)}>{SUBJ_NAME[id]}</Chip>)}</div>
      <label className="block"><Label>Условие задания</Label><textarea ref={ta} className="field" rows={7} value={task} onChange={e => setTask(e.target.value)} placeholder="Вставьте текст задания" /></label>
      <label className="mt-4 block"><Label>Ваш ответ — необязательно</Label><input className="cells" style={cellStyle(ans.length)} value={ans} onChange={e => setAns(e.target.value)} placeholder="Если уже решали — ИИ проверит" /></label>
      <Button className="mt-4 w-full" disabled={!ready} onClick={() => {
        if (!task.trim()) { shake(ta.current); ta.current?.focus(); return; }
        askInChat(`Разбери задание ${exam} по предмету «${SUBJ_NAME[subj]}».\n\n${task.trim()}\n\n${ans.trim() ? "Мой ответ: " + ans.trim() + ". Проверь его и объясни ошибку, если она есть." : "Реши по шагам и объясни, как решать такие задания."}\nНазови тему по кодификатору, к которой относится задание.`);
      }}>{ready ? <>Разобрать <ArrowRight /></> : "ИИ не подключён — см. настройки"}</Button>
    </div>
  );
}

/* ---------- план ---------- */
function PlanSheet() {
  const state = useApp();
  const ready = useAiReady();
  const d = daysLeft(state.examDate) ?? 0, weeks = Math.max(1, Math.round(d / 7)), per = state.subjects.length || 1;
  const [plan, setPlan] = useState<{ text: string; busy: boolean } | null>(null);
  const gen = async () => {
    setPlan({ text: "", busy: true });
    const weak = weakTopics(state).map(t => `${SUBJ_NAME[t.subj]}: ${t.topic}`).join("; ") || "пока не определены";
    try {
      await askAI([{ role: "user", content: `Составь план подготовки к ${state.exam}.
Предметы: ${state.subjects.map(s => SUBJ_NAME[s]).join(", ")}.
До экзамена ${d} дней.
Слабые темы по результатам тренажёра: ${weak}.

Дай план по неделям: что изучать, сколько заданий решать, когда писать пробники. Максимум 250 слов, простым списком, без вступления.` }],
        piece => setPlan(p => ({ text: (p?.text || "") + piece, busy: true })));
      setPlan(p => ({ text: p?.text || "", busy: false }));
    } catch (e) { setPlan({ text: aiErrorText(e), busy: false }); }
  };
  return (
    <div className="pb-2">
      <div className="grid grid-cols-[auto_1fr] items-end gap-x-[18px] gap-y-1 pt-1">
        <div className="row-span-2 font-display text-[88px] leading-[.82] font-black tracking-[-.05em]">{weeks}</div>
        <div className="text-[15px] leading-tight font-semibold">{plural(weeks, "неделя", "недели", "недель")}<br />до {state.exam}</div>
        <div className="font-mono text-xs text-fg-3">{per} {plural(per, "предмет", "предмета", "предметов")}</div>
      </div>
      <Section>Базовая неделя</Section>
      {([["Теория и конспект", "2 дня"], ["Задания части 1", "3 дня"], ["Задания части 2", "1 день"], ["Разбор ошибок", "1 день"]] as const).map(([t, b]) => (
        <div key={t} className="flex items-center gap-3 border-t border-line py-3 first-of-type:border-0">
          <span className="flex-1 text-[14.5px] font-medium">{t}</span>
          <span className="rounded-[5px] border border-line-2 px-[7px] py-[3px] font-mono text-[10.5px] tracking-[.06em] text-fg-2 uppercase">{b}</span>
        </div>
      ))}
      <Button className="mt-[18px] w-full" disabled={!ready || !!plan?.busy} onClick={gen}>{ready ? <>Персональный план от ИИ <ArrowRight /></> : "ИИ не подключён — см. настройки"}</Button>
      {plan && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3.5 rounded-xl bg-bg-2 px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap text-fg-2">
          <Label className="mb-1.5">План от ИИ</Label>{plan.text || <Typing />}
        </motion.div>
      )}
    </div>
  );
}

/* ---------- источники ---------- */
function SourcesSheet() {
  const { subjects, exam } = useApp();
  return (
    <div className="pb-2">
      {subjects.map(id => <SrcLink key={id} href={sdamUrl(id, exam)} title={SUBJ_NAME[id]} sub={`Сдам ГИА · ${exam}`} />)}
      <SrcLink href={fipiBankUrl(exam)} title="Открытый банк заданий ФИПИ" sub="официальные задания" />
      <SrcLink href={fipiDemoUrl(exam)} title="Демоверсии и кодификаторы" sub={`ФИПИ · ${examYear()}`} />
      <p className="mt-2 text-[12.5px] text-fg-3">Нашли задание на сайте? Скопируйте условие и нажмите «Разобрать задание» на главной.</p>
    </div>
  );
}
