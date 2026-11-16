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
# seed.ts компилируем в JS: ts-node — dev-зависимость и после prune его не будет
RUN npm run build \
  && npx tsc prisma/seed.ts --outDir dist-seed --module commonjs --target ES2022 \
     --esModuleInterop --skipLibCheck \
  && npm prune --omit=dev

# ───── Запуск ─────
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist-seed/seed.js ./prisma/seed.js
COPY package.json ./
# В образе `npx prisma db seed` запускает уже скомпилированный seed.js
RUN node -e "const f='package.json',p=require('./'+f);p.prisma.seed='node prisma/seed.js';require('fs').writeFileSync(f,JSON.stringify(p,null,2))"

# Prisma CLI нужен для migrate deploy при старте — ставим ту же версию, что в devDependencies.
RUN npm install --no-save --no-audit --no-fund prisma@$(node -p "require('./package.json').devDependencies.prisma") \
  && mkdir -p uploads && chown -R node:node /app

USER node
EXPOSE 3001
VOLUME ["/app/uploads"]

ENTRYPOINT ["/sbin/tini", "--"]
# Миграции применяются при каждом старте (безопасно: применяются только новые).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
