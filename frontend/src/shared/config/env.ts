/** Адрес backend API. Задаётся в .env.local (NEXT_PUBLIC_API_URL). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Пилот во Владивостоке: всё время показываем и вводим по местному времени. */
export const TIME_ZONE = 'Asia/Vladivostok';
export const TIME_ZONE_OFFSET = '+10:00';

/** Как часто обновлять статусы (веб-сокетов в MVP нет). */
export const POLL_INTERVAL_MS = 30_000;
