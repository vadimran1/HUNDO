// Скриншоты приложения для сайта и манифеста: телефон и компьютер, русский и английский.
//   npm run build && PORT=4173 node scripts/serve.mjs   (в другом окне)
//   node scripts/shots.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(execSync("npm root -g").toString().trim() + "/playwright");

const BASE = process.env.BASE || "http://localhost:4173";
const OUT = new URL("../public/screens/", import.meta.url).pathname;
const today = new Date().toISOString().slice(0, 10);

const variant = (en) => ({
  subj: "hist", exam: "ЕГЭ", created: Date.now(), done: true,
  given: { 1: "862", 2: "1700", 3: "1497", 4: "Петр I", 5: "" },
  results: { 1: { score: 1 }, 2: { score: 0 }, 3: { score: 1 }, 4: { score: 1 }, 5: { score: 0 } },
  tasks: en ? [
    { n: 1, type: "short", topic: "Kievan Rus", q: "In what year, according to the Primary Chronicle, were the Varangians invited to rule?", answer: "862", alt: [], max: 1, exp: "The Primary Chronicle dates the calling of Rurik and his brothers to 862." },
    { n: 2, type: "short", topic: "18th century", q: "Give the year Saint Petersburg was founded.", answer: "1703", alt: [], max: 1, exp: "The Peter and Paul Fortress was laid on 16 May 1703 — the city's founding date." },
    { n: 3, type: "short", topic: "Muscovite state", q: "In what year was the Sudebnik of Ivan III adopted?", answer: "1497", alt: [], max: 1, exp: "The first all-Russian law code, which introduced St George's Day." },
    { n: 4, type: "short", topic: "18th century", q: "Which ruler introduced the Table of Ranks in 1722?", answer: "Peter I", alt: ["Петр I", "peter the great"], max: 1, exp: "Peter I's Table of Ranks set out 14 ranks of the civil, military and court service." },
    { n: 5, type: "short", topic: "19th century", q: "Name the emperor who abolished serfdom in 1861.", answer: "Alexander II", alt: [], max: 1, exp: "Alexander II signed the Emancipation Manifesto on 19 February 1861." },
  ] : [
    { n: 1, type: "short", topic: "Древняя Русь", q: "В каком году состоялось призвание варягов?", answer: "862", alt: [], max: 1, exp: "По «Повести временных лет» Рюрика с братьями призвали в 862 году." },
    { n: 2, type: "short", topic: "XVIII век", q: "Укажите год основания Санкт-Петербурга.", answer: "1703", alt: [], max: 1, exp: "16 мая 1703 года заложена Петропавловская крепость — дата основания города." },
    { n: 3, type: "short", topic: "Московское государство", q: "В каком году был принят Судебник Ивана III?", answer: "1497", alt: [], max: 1, exp: "Первый общерусский свод законов, ввёл Юрьев день." },
    { n: 4, type: "short", topic: "XVIII век", q: "Какой правитель ввёл Табель о рангах в 1722 году?", answer: "Петр I", alt: ["петр 1", "петр первый"], max: 1, exp: "Табель о рангах Петра I установила 14 чинов гражданской, военной и придворной службы." },
    { n: 5, type: "short", topic: "XIX век", q: "Назовите императора, отменившего крепостное право в 1861 году.", answer: "Александр II", alt: [], max: 1, exp: "Манифест подписан 19 февраля 1861 года." },
  ],
});

const chat = (en) => en ? [
  { role: "user", content: "Passive vs active legal capacity — what's the difference?" },
  { role: "assistant", content: "Passive legal capacity (правоспособность) is the ability to HAVE rights and duties. Everyone has it from birth — even a newborn can own a flat.\n\nActive legal capacity (дееспособность) is the ability to EXERCISE them through your own actions: sign contracts, work, marry. In full it starts at 18.\n\nExam trap: a 10-year-old has passive capacity but only partial active capacity — small everyday deals only." },
  { role: "user", content: "And what is emancipation?" },
  { role: "assistant", content: "Emancipation means a 16-year-old is declared fully capable early — if they work under a contract or run a business with their parents' consent. The decision is made by the guardianship authority or a court." },
] : [
  { role: "user", content: "Чем правоспособность отличается от дееспособности?" },
  { role: "assistant", content: "Правоспособность — способность ИМЕТЬ права и обязанности. Она есть у всех с рождения: даже младенец может владеть квартирой.\n\nДееспособность — способность СВОИМИ действиями приобретать и осуществлять права: заключать сделки, работать, вступать в брак. Полностью наступает в 18 лет.\n\nЛовушка в ЕГЭ: у 10-летнего есть правоспособность, но дееспособность лишь частичная — только мелкие бытовые сделки." },
  { role: "user", content: "А что такое эмансипация?" },
  { role: "assistant", content: "Эмансипация — признание 16-летнего полностью дееспособным досрочно, если он работает по трудовому договору или занимается предпринимательством с согласия родителей. Решает орган опеки или суд." },
];

const state = (en, extra = {}) => ({
  state: {
    onboarded: true, exam: "ЕГЭ", subjects: ["hist", "soc", "math", "phys"], examDate: "2027-05-27",
    theme: "dark", accent: "mono", settings: { provider: "server", base: "/api", model: "", key: "" },
    stats: { hist: { done: 24, correct: 19 }, soc: { done: 18, correct: 13 }, math: { done: 12, correct: 11 }, phys: { done: 9, correct: 6 } },
    answered: { h2: false, s4: false }, streak: { days: 12, last: today },
    chat: chat(en), weakAI: [{ subj: "hist", topic: en ? "18th century" : "XVIII век" }], variant: variant(en), ...extra,
  }, version: 1,
});

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
async function shoot({ lang, tab, file, desktop, extra, scroll }) {
  const ctx = await browser.newContext(desktop
    ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "dark" }
    : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark" });
  await ctx.addInitScript(([s, l]) => {
    localStorage.setItem("sotka", s);
    localStorage.setItem("hundo-lang", JSON.stringify({ state: { lang: l }, version: 0 }));
  }, [JSON.stringify(state(lang === "en", extra)), lang]);
  // сервер ИИ отвечает «подключён», чтобы не было плашки «ИИ не подключён»
  await ctx.route("**/api/chat", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, model: "free-gemini-2.5-flash" }) }));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/${tab ? "#" + tab : ""}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(desktop || !tab ? 6000 : 3200);
  if (scroll) { await page.evaluate(y => scrollTo(0, y), scroll); await page.waitForTimeout(400); }
  await page.screenshot({ path: OUT + `${lang}/${file}.png` });
  await ctx.close();
}

for (const lang of ["ru", "en"]) {
  fs.mkdirSync(OUT + lang, { recursive: true });
  await shoot({ lang, tab: "", file: "home" });
  await shoot({ lang, tab: "variant", file: "variant" });
  await shoot({ lang, tab: "chat", file: "chat" });
  await shoot({ lang, tab: "train", file: "train" });
  await shoot({ lang, tab: "", file: "desktop-home", desktop: true });
  await shoot({ lang, tab: "variant", file: "desktop-variant", desktop: true });
  await shoot({ lang, tab: "chat", file: "desktop-chat", desktop: true });
  await shoot({ lang, tab: "stats", file: "desktop-stats", desktop: true });
}
await browser.close();
console.log("готово");
