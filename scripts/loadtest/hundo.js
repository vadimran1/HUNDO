// Нагрузочное тестирование HUNDO через k6 — https://k6.io
// Проверяем, сколько запросов в секунду держат сайт, приложение и статика,
// где начинает расти время ответа и когда появляются ошибки.
//
// ВАЖНО: это тест СВОЕГО сайта. Не запускай против чужих — это уже атака.
// /api/chat намеренно НЕ трогаем: там платная модель с дневным лимитом,
// тест его исчерпает и упрётся в rate-limit, а не в реальную нагрузку.
//
// Запуск (по умолчанию бьём по рабочему сайту, мягкий профиль):
//   k6 run scripts/loadtest/hundo.js
// По своему адресу и с нужной нагрузкой:
//   k6 run -e BASE=https://www.hundo.online -e PEAK=50 scripts/loadtest/hundo.js
// Локально по собранному серверу (npm run build && node scripts/serve.mjs):
//   k6 run -e BASE=http://localhost:3000 -e PEAK=100 scripts/loadtest/hundo.js

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate } from "k6/metrics";

const BASE = (__ENV.BASE || "https://www.hundo.online").replace(/\/+$/, "");
const PEAK = Number(__ENV.PEAK || 20);        // сколько одновременных «посетителей» на пике

const errors = new Rate("errors");            // доля неуспешных запросов

export const options = {
  // плавно разгоняемся, держим пик, плавно отпускаем — так видно, где начинается деградация
  stages: [
    { duration: "30s", target: Math.ceil(PEAK / 2) },
    { duration: "1m", target: PEAK },
    { duration: "1m", target: PEAK },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],           // меньше 1% ошибок
    http_req_duration: ["p(95)<800", "p(99)<2000"], // 95% ответов быстрее 0,8 с
    errors: ["rate<0.01"],
  },
};

function get(path, name) {
  const res = http.get(BASE + path, { tags: { name } });
  const ok = check(res, { [`${name}: 200`]: r => r.status === 200 });
  errors.add(!ok);
  return res;
}

// Один «посетитель»: открыл лендинг, посмотрел ролик-страницу, зашёл в приложение.
export default function () {
  group("лендинг", () => {
    const page = get("/", "landing");
    // подтягиваем статику, как настоящий браузер
    (page.html().find("link[rel=stylesheet],script[src]").toArray() || []).slice(0, 6).forEach(el => {
      const src = el.attr("href") || el.attr("src");
      if (src && src.startsWith("/")) get(src, "asset");
    });
    sleep(Math.random() * 2 + 1);
  });

  group("приложение", () => {
    get("/app/", "app");
    get("/manifest.webmanifest", "manifest");
    sleep(Math.random() * 2 + 1);
  });

  group("api (лёгкий)", () => {
    // только чтение конфигурации входа — без ИИ и без записи
    get("/api/auth", "api-auth");
    sleep(1);
  });
}
