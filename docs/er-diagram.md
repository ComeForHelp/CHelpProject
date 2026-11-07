# ER-диаграмма «Иду на помощь!»

17 таблиц в четырёх группах. Источник правды — [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).
Картинка для отчёта: [`er-diagram.png`](er-diagram.png) (или вставить код ниже в mermaid.live → PNG/SVG).

Центр схемы — `tasks`: к ней трижды привязан `users` (получатель, автор, волонтёр), от неё зависят
список, история, комментарии, вложения и отзывы.

```mermaid
erDiagram
    USERS ||--o| RECIPIENT_PROFILES : "профиль получателя"
    USERS ||--o| VOLUNTEER_PROFILES : "профиль волонтёра"
    USERS ||--o{ RELATIVE_LINKS : "подопечный"
    USERS ||--o{ RELATIVE_LINKS : "родственник"
    USERS ||--o{ REFRESH_TOKENS : "сессии"
    USERS ||--o{ ADDRESSES : "адреса"
    VOLUNTEER_PROFILES ||--o{ VOLUNTEER_DISTRICTS : "работает в"
    DISTRICTS ||--o{ VOLUNTEER_DISTRICTS : ""
    DISTRICTS ||--o{ ADDRESSES : "в районе"
    USERS ||--o{ TASKS : "получатель"
    USERS ||--o{ TASKS : "создал"
    USERS |o--o{ TASKS : "волонтёр"
    TASK_CATEGORIES ||--o{ TASKS : "категория"
    ADDRESSES ||--o{ TASKS : "адрес"
    USERS ||--o{ RECURRING_RULES : "получатель"
    TASK_CATEGORIES ||--o{ RECURRING_RULES : "категория"
    ADDRESSES ||--o{ RECURRING_RULES : "адрес"
    RECURRING_RULES |o--o{ TASKS : "порождает"
    TASKS ||--o{ TASK_ITEMS : "список"
    TASKS ||--o{ TASK_STATUS_HISTORY : "история"
    TASKS ||--o{ TASK_COMMENTS : "комментарии"
    TASKS ||--o{ ATTACHMENTS : "вложения"
    TASKS ||--o{ REVIEWS : "отзывы"
    USERS ||--o{ REVIEWS : "автор"
    USERS ||--o{ NOTIFICATIONS : "уведомления"

    USERS {
        uuid id PK
        enum role
        string phone UK
        string email UK
        string password_hash
        string last_name
        string first_name
        string middle_name
        bool is_active
        timestamp pd_consent_at
        timestamp created_at
    }
    RECIPIENT_PROFILES {
        uuid user_id PK, FK
        text mobility_notes
        enum contact_preference
    }
    VOLUNTEER_PROFILES {
        uuid user_id PK, FK
        enum verification_status
        uuid verified_by_id FK
        timestamp verified_at
        bool has_car
        decimal rating_avg
        int tasks_done
    }
    VOLUNTEER_DISTRICTS {
        uuid volunteer_id PK, FK
        int district_id PK, FK
    }
    RELATIVE_LINKS {
        uuid id PK
        uuid recipient_id FK
        uuid relative_id FK
        string relation
        enum status
    }
    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash
        timestamp expires_at
    }
    DISTRICTS {
        int id PK
        string name
    }
    TASK_CATEGORIES {
        int id PK
        string code UK
        string name
        bool needs_money
    }
    ADDRESSES {
        uuid id PK
        uuid user_id FK
        int district_id FK
        string street
        string house
        string apartment
        int floor
        bool has_elevator
        text access_notes
    }
    TASKS {
        uuid id PK
        uuid recipient_id FK
        uuid created_by_id FK
        uuid volunteer_id FK
        int category_id FK
        uuid address_id FK
        uuid recurring_rule_id FK
        string title
        enum status
        enum urgency
        timestamp window_start
        timestamp window_end
        decimal estimated_cost
        enum payment_method
        timestamp accepted_at
        timestamp done_at
        timestamp confirmed_at
    }
    TASK_ITEMS {
        uuid id PK
        uuid task_id FK
        string name
        string quantity
        bool is_checked
    }
    RECURRING_RULES {
        uuid id PK
        uuid recipient_id FK
        int category_id FK
        uuid address_id FK
        enum frequency
        int_array days_of_week
        time time_from
        time time_to
        jsonb items_template
        bool is_active
    }
    TASK_STATUS_HISTORY {
        uuid id PK
        uuid task_id FK
        enum from_status
        enum to_status
        uuid changed_by_id FK
    }
    TASK_COMMENTS {
        uuid id PK
        uuid task_id FK
        uuid author_id FK
        text text
    }
    ATTACHMENTS {
        uuid id PK
        uuid task_id FK
        uuid uploaded_by_id FK
        enum kind
        string file_path
    }
    REVIEWS {
        uuid id PK
        uuid task_id FK
        uuid author_id FK
        uuid target_id FK
        int rating
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid task_id FK
        string type
        timestamp read_at
    }
```

## Жизненный цикл заявки

```mermaid
stateDiagram-v2
    [*] --> NEW
    NEW --> ASSIGNED: волонтёр взял / координатор назначил
    ASSIGNED --> NEW: волонтёр отказался
    ASSIGNED --> IN_PROGRESS: начал выполнение
    IN_PROGRESS --> DONE: выполнено
    DONE --> CONFIRMED: получатель принял
    NEW --> CANCELLED: отмена
    ASSIGNED --> CANCELLED: отмена
    NEW --> EXPIRED: окно истекло (cron)
    CONFIRMED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

Реализация — [`backend/src/modules/tasks/task-status.machine.ts`](../backend/src/modules/tasks/task-status.machine.ts).
Каждый переход пишется в `task_status_history`.

## Ограничения целостности сверх схемы Prisma

Добавлены в миграцию `20261107000000_init` вручную:

| Ограничение | Смысл |
|---|---|
| `reviews_rating_check` | оценка 1–5 |
| `tasks_window_check` | конец окна позже начала |
| `tasks_volunteer_check` | у ASSIGNED / IN_PROGRESS / DONE всегда есть волонтёр |
| `recurring_rules_*_check` | день месяца 1–28, дни недели 1–7, время и период корректны |
| `relative_links_self_check` | нельзя быть родственником самому себе |
| `addresses_one_default_per_user` | не больше одного основного адреса |
