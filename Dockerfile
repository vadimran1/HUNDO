# HUNDO одним контейнером: сайт + приложение + функции api/ на Node.js.
# Нужен для хостинга в России (Amvera, Timeweb, любой VPS), где адреса Vercel бывают недоступны.
# Переменные окружения — те же, что в Vercel: OPENROUTER_API_KEY, REDIS_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_NAME…
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/scripts/serve.mjs ./scripts/serve.mjs
COPY --from=build /app/package.json ./package.json
EXPOSE 80
CMD ["node", "scripts/serve.mjs"]
