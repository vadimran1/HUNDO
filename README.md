# HUNDO — ИИ-помощник по ЕГЭ и ОГЭ

**HUNDO** — «сотка» на английском сленге, то есть 100 баллов.

Школьный проект: приложение для подготовки к ЕГЭ и ОГЭ с ИИ-репетитором. Ставится на iPhone и Android с сайта, без App Store и Google Play (PWA).

- **Сайт для установки** — `/`: кнопка установки под платформу, шаги, QR-код.
- **Приложение** — `/app/`: тренажёр, варианты от ИИ, разбор заданий, чат, прогресс, план.
- **Сервер ИИ** — `/api/chat`: функция Vercel, хранит ключ и передаёт запросы в OpenRouter.

## Стек

| Что | Чем сделано |
|---|---|
| Интерфейс | React 19, TypeScript, Vite |
| Стили | Tailwind CSS 4, монохромный стиль по рекомендациям UI/UX Pro Max |
| Анимации | Motion (motion.dev): переходы экранов, шторки со смахиванием, общие layout-анимации |
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
| Скриншоты на сайте | `public/screens/*.webp` (780×1688) |
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
```

## Источники заданий
- [Открытый банк заданий ФИПИ](https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege), [демоверсии и кодификаторы](https://fipi.ru/ege/demoversii-specifikacii-kodifikatory)
- [Сдам ГИА: ЕГЭ](https://ege.sdamgia.ru/), [Сдам ГИА: ОГЭ](https://oge.sdamgia.ru/)

## Благодарности и лицензии
Magic UI (MIT), shadcn/ui (MIT), Motion (MIT), Lucide (ISC), Fontsource: Unbounded, Onest, JetBrains Mono (OFL), qrcode-generator (MIT). Дизайн-рекомендации — UI/UX Pro Max.
