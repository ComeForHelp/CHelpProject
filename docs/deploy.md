# Развёртывание на сервере (тестовый стенд)

Итог: сайт по адресу `https://ДОМЕН` с HTTPS, тестовыми пользователями и плашкой «Тестовый стенд».
Время — около 30 минут, из них 10–15 минут первая сборка.

```
Интернет ──443──▶ Caddy ──/api/*──▶ backend:3001 ──▶ postgres:5432
                    └──── всё остальное ──▶ frontend:3000
```

Наружу открыт только Caddy (порты 80 и 443). Он сам получает и продлевает сертификат Let's Encrypt.
База, backend и frontend из интернета недоступны.

## 1. Сервер

| Параметр | Значение |
|---|---|
| Где | VPS в России (152-ФЗ): Timeweb Cloud, Selectel, REG.RU, Beget… |
| Система | Ubuntu 24.04 |
| Память | **4 ГБ** (с 2 ГБ — обязательно файл подкачки, шаг 3) |
| Процессор / диск | 2 vCPU, от 30 ГБ |

## 2. Адрес сайта

- **Свой домен** — в DNS добавить запись `A` → IP сервера. В `.env` указать `DOMAIN=help.example.ru`.
- **Без домена** — сервис sslip.io: адрес из IP через дефисы, ничего настраивать не нужно.
  IP `5.35.12.34` → `DOMAIN=5-35-12-34.sslip.io`.

## 3. Подготовка сервера (один раз)

```bash
ssh root@IP_СЕРВЕРА

# Docker
curl -fsSL https://get.docker.com | sh

# Файл подкачки 4 ГБ — нужен для сборки frontend, если памяти меньше 4 ГБ
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Брандмауэр: только SSH и веб
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

Если у хостинга есть свой брандмауэр в панели — открыть там порты 22, 80, 443.

## 4. Код и настройки

```bash
git clone https://github.com/ComeForHelp/CHelpProject.git /opt/idu-help
cd /opt/idu-help
cp .env.prod.example .env

# Случайные пароль БД и секреты JWT
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^JWT_ACCESS_SECRET=.*/JWT_ACCESS_SECRET=$(openssl rand -hex 32)/" .env
sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$(openssl rand -hex 32)/" .env

nano .env        # вписать DOMAIN
```

`.env` в git не попадает. Не публикуйте его содержимое.

## 5. Запуск

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

Миграции БД применяются сами при старте backend. Seed создаёт районы, категории и тестовых пользователей
(пароль `password123`, список — в [testing.md](testing.md)).

Открыть `https://ДОМЕН`. Первый заход может занять до минуты — Caddy получает сертификат.

## Повседневное

Чтобы не писать `-f docker-compose.prod.yml` каждый раз:

```bash
alias dc='docker compose -f /opt/idu-help/docker-compose.prod.yml --project-directory /opt/idu-help'
```

| Задача | Команда |
|---|---|
| Обновить до свежего `main` | `cd /opt/idu-help && git pull && dc up -d --build` |
| Состояние контейнеров | `dc ps` |
| Логи backend / всего | `dc logs -f backend` · `dc logs -f --tail 100` |
| **Сбросить данные** к тестовым | `dc exec backend npx prisma migrate reset --force` (удаляет всё и заново запускает seed) |
| Резервная копия БД | `dc exec -T postgres pg_dump -U idu idu_na_pomoshch > backup-$(date +%F).sql` |
| Проверить Caddyfile | `dc exec caddy caddy validate --config /etc/caddy/Caddyfile` |
| Остановить | `dc down` (данные сохраняются; `dc down -v` — удалить и данные) |

## Если что-то не так

| Симптом | Причина и что сделать |
|---|---|
| Браузер пишет про небезопасное соединение | Caddy не получил сертификат: `dc logs caddy`. Обычно закрыты порты 80/443 или DNS ещё не указывает на сервер |
| Сборка frontend падает, `Killed` | Не хватило памяти — добавить файл подкачки (шаг 3) |
| Сайт открывается, но вход не работает | `DOMAIN` в `.env` должен совпадать с адресом в браузере. После смены — `dc up -d --build` (адрес API вшивается при сборке) |
| `Задайте … в .env` | Не заполнена переменная в `.env` |

## Перед настоящим пилотом

- В `.env`: `SEED_DEMO=false`, `STAND_LABEL=` (пусто), пересобрать.
- Сменить пароль администратора, удалить тестовых пользователей (или поднять стенд с чистой БД).
- Настроить ежедневную резервную копию БД (cron + `pg_dump`) и копирование на другой сервер.
