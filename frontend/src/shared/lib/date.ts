import { TIME_ZONE, TIME_ZONE_OFFSET } from '../config/env';

/**
 * Даты и время. Сервер хранит UTC, показываем и вводим — по Владивостоку.
 * «Дата без времени» везде — строка YYYY-MM-DD.
 */

const DAY_MS = 24 * 3600_000;

/** Местная дата YYYY-MM-DD. */
export function toYmd(date: Date | string): string {
  // en-CA даёт формат 2026-11-10
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

export function todayYmd(now: Date = new Date()): string {
  return toYmd(now);
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`).getTime() + days * DAY_MS;
  return new Date(d).toISOString().slice(0, 10);
}

/** Местные дата и время → ISO в UTC для API. */
export function localToIso(ymd: string, hhmm: string): string {
  return new Date(`${ymd}T${hhmm}:00${TIME_ZONE_OFFSET}`).toISOString();
}

/** Время суток HH:MM по Владивостоку. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** «вт, 10 ноября» */
export function formatDay(isoOrYmd: string): string {
  const date =
    isoOrYmd.length === 10
      ? new Date(`${isoOrYmd}T12:00:00${TIME_ZONE_OFFSET}`)
      : new Date(isoOrYmd);
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/** «Сегодня», «Завтра», «Вчера» или «вт, 10 ноября». */
export function dayLabel(isoOrYmd: string, now: Date = new Date()): string {
  const ymd = isoOrYmd.length === 10 ? isoOrYmd : toYmd(isoOrYmd);
  const today = todayYmd(now);
  if (ymd === today) return 'Сегодня';
  if (ymd === addDaysYmd(today, 1)) return 'Завтра';
  if (ymd === addDaysYmd(today, -1)) return 'Вчера';
  return formatDay(ymd);
}

/** «Сегодня, 09:00–12:00» */
export function formatWindow(start: string, end: string, now: Date = new Date()): string {
  const sameDay = toYmd(start) === toYmd(end);
  if (sameDay) return `${dayLabel(start, now)}, ${formatTime(start)}–${formatTime(end)}`;
  return `${dayLabel(start, now)} ${formatTime(start)} — ${dayLabel(end, now)} ${formatTime(end)}`;
}

/** «10 ноября, 14:05» */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Части дня для выбора времени без календаря (TimeStep). */
export const DAY_PARTS = {
  morning: { label: 'Утро', from: '09:00', to: '12:00' },
  day: { label: 'День', from: '12:00', to: '17:00' },
  evening: { label: 'Вечер', from: '17:00', to: '21:00' },
} as const;
export type DayPart = keyof typeof DAY_PARTS;

export function slotWindow(ymd: string, part: DayPart): { windowStart: string; windowEnd: string } {
  const p = DAY_PARTS[part];
  return { windowStart: localToIso(ymd, p.from), windowEnd: localToIso(ymd, p.to) };
}

/** Слот ещё можно выбрать: до его конца больше часа. */
export function isSlotAvailable(ymd: string, part: DayPart, now: Date = new Date()): boolean {
  const end = new Date(slotWindow(ymd, part).windowEnd).getTime();
  return end - now.getTime() > 3600_000;
}

/** Обратное преобразование: какому дню и части дня соответствует окно (для черновика и повтора). */
export function detectSlot(windowStart: string): { ymd: string; part: DayPart | null } {
  const ymd = toYmd(windowStart);
  const time = formatTime(windowStart);
  const part =
    (Object.keys(DAY_PARTS) as DayPart[]).find((k) => DAY_PARTS[k].from === time) ?? null;
  return { ymd, part };
}
