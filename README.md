# HUNDO — ИИ-помощник по ЕГЭ и ОГЭ

**HUNDO** — «сотка» на английском сленге, то есть 100 баллов.

Школьный проект: приложение для подготовки к ЕГЭ и ОГЭ с ИИ-репетитором. Ставится на iPhone и Android с сайта, без App Store и Google Play (PWA).

- **Сайт** — `/` (русский) и `/en` (английский): установка на телефон, QR-код, версия для компьютера, промо-ролик.
- **Приложение** — `/app/`: тренажёр, варианты от ИИ, разбор заданий, чат, прогресс, план. На телефоне — нижние вкладки, на компьютере (экран от 1024 px) — боковое меню, широкие экраны и горячие клавиши.
- **Сервер ИИ** — `/api/chat`: функция Vercel, хранит ключ и передаёт запросы в OdiRouter или OpenRouter.
- **Промо-ролики** — `video/`: сделаны кодом на Remotion, русская и английская версии. Энергичный под бит (150 BPM, 32 с) и спокойный (30 с).

## Два языка
Переключатель **RU / EN** — в шапке сайта, на титульном экране, в боковом меню и в настройках. Выбор общий для сайта и приложения.
- Тексты переведены прямо в коде парами: `t("Главная", "Home")` (см. `src/lib/i18n.ts`).
- Задания тренажёра переведены в `src/lib/tasks.ts` (блок `EN`); в английском режиме принимаются ответы на обоих языках.
- В английском режиме ИИ отвечает по-английски, а русские термины даёт в скобках.

## Компьютер
- На компьютере сайт не предлагает «установить», а даёт **«Скачать на телефон»** (окно с QR-кодом) и **«Веб-версия»**.
- Веб-версия — то же приложение `/app/` в браузере: клавиши **1–5** переключают разделы, **Enter** проверяет ответ и открывает следующее задание, настройки открываются панелью справа.

## Стек

| Что | Чем сделано |
|---|---|
| Интерфейс | React 19, TypeScript, Vite |
| Стили | Tailwind CSS 4, монохромный стиль по рекомендациям UI/UX Pro Max |
| Анимации | Motion (motion.dev): переходы экранов, шторки со смахиванием, общие layout-анимации |
| Ролик | Remotion 4 (видео из React-кода), музыка синтезирована на Python (numpy), сборка звука — FFmpeg |
| Компоненты | Magic UI и shadcn/ui из каталога 21st.dev: Iphone, BlurFade, NumberTicker, BorderBeam, Marquee, AnimatedGridPattern, Button |
| PWA | vite-plugin-pwa (Workbox): офлайн-режим и плашка «Вышла новая версия» |
| ИИ | OdiRouter (или OpenRouter) через серверную функцию Vercel, ответ приходит потоком |
| Хостинг | Vercel: каждый push в GitHub автоматически выкладывает новую версию |

## Запуск в интернете: GitHub + Vercel

### 1. Ключ для ИИ (бесплатно)
Подходит ключ [OdiRouter](https://odirouter.ai) или [OpenRouter](https://openrouter.ai). Сервер сам понимает по ключу, чей он:
- ключ OpenRouter (начинается с `sk-or-v1-`) → модель `openrouter/free`;
- любой другой ключ → OdiRouter, бесплатная модель `free-gemini-2.5-flash`.

У OdiRouter без пополнения баланса: до 50 запросов к бесплатным моделям в день и 5 в минуту. После пополнения — 100 в день и 100 в минуту.

### 2. Репозиторий на GitHub
1. На [github.com](https://github.com) нажмите **New repository**, например `hundo`. Можно сделать приватным.
2. Загрузите файлы проекта одним из способов:
   - **Через сайт:** «uploading an existing file», перетащите все файлы и папки, **кроме `node_modules` и `dist`**.
   - **Через git** (в архиве уже есть первый коммит):
     ```bash
     git remote add origin https://github.com/ВАШ-ЛОГИН/hundo.git
     git push -u origin main
     ```

### 3. Проект на Vercel
1. Зайдите на [vercel.com](https://vercel.com) через аккаунт GitHub.
2. **Add New → Project** → выберите репозиторий `hundo` → **Import**.
3. Framework определится сам (Vite). Ничего не меняйте.
4. Откройте **Environment Variables** и добавьте:
   - `OPENROUTER_API_KEY` = ваш ключ.
5. Нажмите **Deploy**. Через минуту сайт будет по адресу вида `hundo-xxx.vercel.app`.

Дополнительные переменные (по желанию):

| Переменная | По умолчанию | Зачем |
|---|---|---|
| `AI_MODEL` | по ключу | другая модель, например `free-gpt-5.4-mini` (OdiRouter) |
| `AI_MAX_TOKENS` | `4000` | предел длины ответа |
| `RATE_LIMIT_PER_MIN` | `20` | сколько запросов в минуту можно с одного адреса |
| `AI_BASE_URL` | по ключу | другой OpenAI-совместимый сервис |

Если переменную добавили после деплоя: **Deployments → ⋯ → Redeploy**.

### 4. Активные обновления
1. Меняете что-то в коде и делаете commit и push в GitHub (или редактируете файл прямо на сайте GitHub).
2. Vercel сам собирает и выкладывает новую версию, это около минуты.
3. У всех, кто установил приложение, при следующем открытии появится плашка **«Вышла новая версия»** с текстом вашего коммита и кнопкой «Обновить».

Поэтому пишите понятные сообщения коммитов: «Добавил задания по химии», а не «fix».

### 5. Свой домен (по желанию)
Vercel → Project → **Settings → Domains**. Если адрес `*.vercel.app` у кого-то открывается плохо, свой домен обычно решает проблему.

## Что где менять

| Хочу изменить | Файл |
|---|---|
| Название на логотипе | `src/lib/data.ts` → `APP_NAME` |
| Задания тренажёра | `src/lib/tasks.ts`: скопируйте запись и поменяйте поля |
| Цвета и шрифты | `src/styles/globals.css` |
| Тексты сайта для установки | `src/landing/Landing.tsx` |
| Переводы | рядом с текстом: `t("рус", "eng")`; язык — `src/lib/i18n.ts` |
| Скриншоты на сайте | `public/screens/ru/`, `public/screens/en/` — пересоздаются скриптом `scripts/shots.mjs` |
| Промо-ролики | `video/src/Hype.tsx`, `video/src/Promo.tsx` (сцены и тексты), `video/hype_music.py`, `video/music.py` (музыка) |
| Иконка | `public/icons/` |
| Промпт репетитора | `src/lib/ai.ts` → `SYSTEM_PROMPT` |

## Разработка на компьютере
Нужен [Node.js](https://nodejs.org) 20 или новее.
```bash
npm install
npm run dev          # http://localhost:5173 — сайт, /app/ — приложение (без ИИ-сервера)

npm run build        # сборка в dist
OPENROUTER_API_KEY=ваш_ключ node scripts/serve.mjs   # http://localhost:3000 — всё вместе, с ИИ
```

## Промо-ролики
Два ролика, оба собраны кодом (React + Remotion), музыка синтезирована на Python — чужих сэмплов нет:
- **под бит** — `video/src/Hype.tsx` + `video/hype_music.py`: 150 BPM, одна доля = ровно 12 кадров, поэтому каждая склейка и вспышка стоит на доле;
- **спокойный** — `video/src/Promo.tsx` + `video/music.py`.

```bash
cd video && npm install
npm run studio                                  # предпросмотр в браузере
python3 hype_music.py && node render.mjs video ru,en hype    # → public/promo/hundo-hype-ru.mp4, -en.mp4
python3 music.py && node render.mjs video ru,en promo        # → public/promo/hundo-ru.mp4, -en.mp4
```
Нужны Python 3 с numpy и scipy (музыка) и FFmpeg (звуковая дорожка, громкость −14 LUFS).

## Скриншоты
```bash
npm run build && PORT=4173 node scripts/serve.mjs   # в отдельном окне
node scripts/shots.mjs && python3 scripts/webp.py   # телефон и компьютер, RU и EN
```

## Структура
```
api/chat.js              серверная функция ИИ (Vercel)
index.html               сайт для установки
app/index.html           приложение
src/landing/             лендинг: установка, QR, экраны
src/app/                 приложение: экраны, шторки, оболочка
src/components/magicui/  компоненты Magic UI (через 21st.dev)
src/components/ui/       кнопка shadcn/ui, переключатели
src/lib/                 данные, хранилище, ИИ, эффекты, банк заданий
vite.config.ts           сборка, PWA, манифест, версия из коммита
vercel.json              настройки Vercel
video/                   промо-ролик (Remotion): сцены, музыка, рендер
scripts/                 локальный сервер, скриншоты
```

## Источники заданий
- [Открытый банк заданий ФИПИ](https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege), [демоверсии и кодификаторы](https://fipi.ru/ege/demoversii-specifikacii-kodifikatory)
- [Сдам ГИА: ЕГЭ](https://ege.sdamgia.ru/), [Сдам ГИА: ОГЭ](https://oge.sdamgia.ru/)

## Благодарности и лицензии
Magic UI (MIT), shadcn/ui (MIT), Motion (MIT), Remotion (Remotion License — бесплатно для частных лиц и небольших команд), Lucide (ISC), Fontsource: Unbounded, Onest, JetBrains Mono (OFL), qrcode-generator (MIT). Музыка ролика синтезирована кодом, чужих сэмплов нет. Дизайн-рекомендации — UI/UX Pro Max.
