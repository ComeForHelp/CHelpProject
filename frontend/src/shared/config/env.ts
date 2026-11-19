/** Адрес backend API. Задаётся в .env.local (NEXT_PUBLIC_API_URL). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Пилот во Владивостоке: всё время показываем и вводим по местному времени. */
export const TIME_ZONE = 'Asia/Vladivostok';
export const TIME_ZONE_OFFSET = '+10:00';

/** Как часто обновлять статусы (веб-сокетов в MVP нет). */
export const POLL_INTERVAL_MS = 15_000;
/** Открытая карточка заявки — чаще: там ждут, когда волонтёр возьмёт или выполнит. */
export const TASK_POLL_INTERVAL_MS = 10_000;

/** Надпись на плашке сверху. Задаётся только на тестовом стенде (NEXT_PUBLIC_STAND_LABEL). */
export const STAND_LABEL = process.env.NEXT_PUBLIC_STAND_LABEL ?? '';

/**
 * Телефон координатора для «Забыли пароль?» и подвала сайта (NEXT_PUBLIC_SUPPORT_PHONE, +7XXXXXXXXXX).
 * Пусто — номер не показываем.
 */
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '';
