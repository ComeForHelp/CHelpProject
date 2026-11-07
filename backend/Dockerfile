# ───── Сборка ─────
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ───── Запуск ─────
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Prisma CLI нужен для migrate deploy при старте — ставим ту же версию, что в devDependencies.
RUN npm install --no-save --no-audit --no-fund prisma@$(node -p "require('./package.json').devDependencies.prisma") \
  && mkdir -p uploads && chown -R node:node /app

USER node
EXPOSE 3001
VOLUME ["/app/uploads"]

ENTRYPOINT ["/sbin/tini", "--"]
# Миграции применяются при каждом старте (безопасно: применяются только новые).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
