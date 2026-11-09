# API для фронтенда

Памятка для Frontend №1–3: как подключиться к backend и о чём не забыть.
Полный контракт — Swagger: http://localhost:3001/api/docs

## Запустить backend у себя

```bash
docker compose up -d --build                      # из корня репозитория
docker compose exec backend npx prisma db seed    # тестовые данные
```

Без Docker — см. «Запуск backend без Docker» в [README](../README.md).

Тестовые входы, пароль `password123`:

| Телефон | Роль | Раздел |
|---|---|---|
| +79000000003 | получатель Мария Петровна (есть адрес, 2 заявки, регулярное поручение) | `/my` |
| +79000000004 | родственник, дочь Марии Петровны | `/family` |
| +79000000005 | волонтёр, проверен | `/volunteer` |
| +79000000006 | волонтёр, ждёт проверки | `/volunteer/pending` |
| +79000000002 | координатор | `/coord` |
| +79000000001 | администратор | `/coord` |

## Типы TypeScript из API

Не пишите типы ответов руками — генерируйте из backend:

```bash
npx openapi-typescript http://localhost:3001/api/docs-json -o src/shared/api/schema.d.ts
```

```ts
import type { components, paths } from '@/shared/api/schema';
type S = components['schemas'];

type Task = S['TaskDetailDto'];          // карточка заявки
type TaskStatus = S['TaskStatus'];       // 'NEW' | 'ASSIGNED' | …
type MyTasks = paths['/api/v1/tasks/my']['get']['responses']['200']['content']['application/json'];
```

После изменений на backend — перегенерировать. Ошибки компиляции покажут, что сломалось.

## Правила, которые легко нарушить

### Токены

- `POST /auth/login` → `{ accessToken, refreshToken, user }`. Запросы — с `Authorization: Bearer <accessToken>`.
- access-токен живёт **15 минут**. В его payload есть `role` — `middleware.ts` может прочитать роль без запроса к серверу
  (подпись проверяет backend; фронтенду достаточно декодировать).
- **refresh-токен одноразовый.** `POST /auth/refresh` выдаёт новую пару, старый токен сразу недействителен.
  Если несколько запросов одновременно получат 401 и каждый пойдёт обновлять токен, второй получит 401 и разлогинит
  пользователя. В axios-перехватчике держите **один общий промис обновления**:

```ts
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original._retry) throw error;
  original._retry = true;
  refreshing ??= refreshTokens().finally(() => (refreshing = null)); // один запрос на всех
  original.headers.Authorization = `Bearer ${await refreshing}`;
  return api(original);
});
```

- Волонтёр со статусом `verificationStatus !== 'VERIFIED'` получит 403 на каталоге — пускать только на `/volunteer/pending` и `/volunteer/profile`.

### Ошибки

Всегда одного вида — `ErrorResponseDto`:

```json
{ "statusCode": 409, "error": "CONFLICT", "message": "Нельзя перевести заявку из «Выполняется» в «Отменена»", "path": "…", "timestamp": "…" }
```

`message` — готовый текст на русском, показывайте как есть. У ошибок валидации (400) это массив строк.

| Код | Что делать |
|---|---|
| 401 | обновить токен; не вышло — на `/login` |
| 403 | действие недоступно этой роли / чужая заявка |
| 409 | состояние изменилось (заявку уже взяли, статус сменился) — показать `message` и перезагрузить данные |
| 429 | слишком много попыток входа — «подождите минуту» |

### Заявка: кнопки и поля

- **Кнопки статусов рисуйте по `availableTransitions`** из `GET /tasks/{id}` — это список статусов, куда *этот*
  пользователь может перевести заявку сейчас. Не дублируйте правила на фронтенде.

| Условие | Кнопка | Запрос |
|---|---|---|
| `canTake: true` (волонтёр смотрит из каталога, `availableTransitions` пуст) | «Взять» | `POST /tasks/{id}/take` |
| `NEW` в списке, `viewerRelation = VOLUNTEER` | «Отказаться» | `POST /tasks/{id}/decline` с `{ reason }` |
| `NEW` в списке, `viewerRelation = STAFF` | «Снять волонтёра» | `POST /tasks/{id}/unassign` |
| `IN_PROGRESS` | «Начал выполнение» | `POST /tasks/{id}/start` |
| `DONE` | «Выполнено» | `POST /tasks/{id}/done` |
| `CONFIRMED` | «Подтвердить» | `POST /tasks/{id}/confirm` |
| `CANCELLED` | «Отменить» | `POST /tasks/{id}/cancel` с `{ reason }` |
| координатор, статус `NEW` или `ASSIGNED` | «Назначить волонтёра» | `POST /tasks/{id}/assign` с `{ volunteerId }` |

- `viewerRelation`: `OWNER` — получатель/родственник, `VOLUNTEER` — назначенный волонтёр, `STAFF` — координатор,
  `CATALOG` — волонтёр смотрит открытую заявку. Для `CATALOG` в ответе **нет** телефона, квартиры, фамилии —
  поля необязательные в типах, проверяйте на `undefined`.
- Статусы пользователю — словами: `NEW` «Ждёт волонтёра», `ASSIGNED` «Волонтёр взял», `IN_PROGRESS` «Выполняется»,
  `DONE` «Волонтёр выполнил», `CONFIRMED` «Получатель принял», `CANCELLED` «Отменена», `EXPIRED` «Не взята в срок».

### Даты, время, деньги

- Все `…At`, `windowStart`, `windowEnd` — ISO в **UTC**. Показывать во времени Владивостока (`Asia/Vladivostok`, UTC+10).
- Отправлять тоже ISO: «завтра утром» = `windowStart: 2026-11-08T09:00:00+10:00`.
- В регулярных правилах иначе: `timeFrom: "10:00"` — уже **местное** время, `startsOn: "2026-11-10"` — дата без времени.
- Деньги и рейтинг — числа (`350.5`), не строки.

### Списки

`{ items, total, page, limit }`, параметры `?page=1&limit=20` (limit до 100).

### Фото чеков

- Загрузка: `multipart/form-data`, поля `file` и `kind` (`RECEIPT` / `PRESCRIPTION` / `PHOTO`). JPEG, PNG, WebP, HEIC, PDF до 10 МБ.
  Тип проверяется по содержимому, а не по расширению.
- **`<img src=".../file">` не сработает** — файл отдаётся только с токеном. Скачивайте через axios:

```ts
const { data } = await api.get(`/tasks/${taskId}/attachments/${id}/file`, { responseType: 'blob' });
const url = URL.createObjectURL(data); // в <img src>; не забыть URL.revokeObjectURL
```

### Обновление статусов

Веб-сокетов в MVP нет. Опрашивайте раз в 30 секунд (`refetchInterval: 30_000` в TanStack Query):
- `GET /notifications/unread-count` — значок в шапке;
- открытую заявку `GET /tasks/{id}` и списки активных заявок.

## Карта маршрутов фронтенда → API

| Страница | Запросы |
|---|---|
| `/register` | `POST /auth/register` (`role`: RECIPIENT / RELATIVE / VOLUNTEER, `pdConsent: true`) |
| `/my` | `GET /tasks/my?scope=active`, `GET /recurring-rules` (поле `nextDates`) |
| `/my/tasks/new` | `GET /dictionaries/categories`, `GET /addresses`, `POST /tasks` |
| `/my/tasks/[id]` | `GET /tasks/{id}`, `/comments`, `/attachments`, действия статусов, `POST /tasks/{id}/reviews` |
| `/my/history` | `GET /tasks/my?scope=history`, «Повторить» — `POST /tasks/{id}/repeat` |
| `/my/recurring…` | `GET/POST/PATCH/DELETE /recurring-rules` (пауза — `PATCH { isActive: false }`) |
| `/my/profile` | `GET /recipients/me`, `PATCH /users/me`, `GET /relatives/links`, `POST /relatives/links/{id}/confirm` |
| `/family` | `GET /relatives/links` (поле `activeTasks`) |
| `/family/link` | `POST /relatives/links/request` или `POST /recipients` (зарегистрировать нового) |
| `/family/[recipientId]/…` | те же запросы, что `/my`, с `recipientId` |
| `/volunteer/pending` | `GET /volunteers/me` (`verificationStatus`, `verificationNote`) |
| `/volunteer/catalog` | `GET /tasks/catalog` (фильтры: `districtIds`, `categoryId`, `date`, `urgency`, `needsMoney`) |
| `/volunteer/tasks/[id]` | `GET /tasks/{id}`, `take` / `start` / `done` / `decline`, `PATCH /tasks/{id}/items/{itemId}` `{ isChecked }`, загрузка чека |
| `/volunteer/my`, `/history` | `GET /tasks/my?scope=active`, `GET /volunteers/me/history` |
| `/volunteer/profile` | `GET/PATCH /volunteers/me` (`districtIds`, `hasCar`, `about`) |
| `/coord` | `GET /coordinator/dashboard` — ключи совпадают с фильтрами `GET /tasks` |
| `/coord/tasks` | `GET /tasks?status=…&districtId=…&overdue=true…` |
| `/coord/tasks/new` | `GET /recipients?q=…`, `POST /tasks` с `recipientId` |
| `/coord/tasks/[id]` | `GET /tasks/{id}`, `GET /tasks/{id}/history`, `assign` / `unassign`, подбор — `GET /volunteers?status=VERIFIED&districtId=…&sort=rating` |
| `/coord/volunteers…` | `GET /volunteers?status=PENDING`, `GET /volunteers/{id}`, `POST /volunteers/{id}/verify` |
| `/coord/recipients…` | `GET /recipients`, `POST /recipients`, `GET /recipients/{id}` |
| `/coord/reports` | `GET /coordinator/reports?from=…&to=…` |

## CORS

Разрешён `http://localhost:3000`. Другой адрес — добавить в `CORS_ORIGIN` в `backend/.env` (через запятую).
