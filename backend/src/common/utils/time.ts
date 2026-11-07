/**
 * Работа с местным временем пилота (Владивосток, UTC+10, без летнего времени).
 * Даты без времени («2026-11-10») храним в колонках DATE, время суток — в колонках TIME.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Местная календарная дата (YYYY-MM-DD) для момента времени. */
export function localDateString(instant: Date, offsetHours: number): string {
  return new Date(instant.getTime() + offsetHours * 3600_000).toISOString().slice(0, 10);
}

/** Date (полночь UTC) для колонки DATE из строки YYYY-MM-DD. */
export function dateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function addDays(ymd: string, days: number): string {
  return new Date(dateOnly(ymd).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO-день недели: 1 = пн … 7 = вс. */
export function isoWeekday(ymd: string): number {
  const day = dateOnly(ymd).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Полных недель между понедельниками недель двух дат. */
export function weeksBetween(fromYmd: string, toYmd: string): number {
  const monday = (ymd: string) => dateOnly(ymd).getTime() - (isoWeekday(ymd) - 1) * DAY_MS;
  return Math.round((monday(toYmd) - monday(fromYmd)) / (7 * DAY_MS));
}

/** "09:30" → Date для колонки TIME (Prisma хранит её как 1970-01-01T09:30:00Z). */
export function timeOfDay(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}.000Z`);
}

/** Date из колонки TIME → "09:30". */
export function timeToString(t: Date): string {
  return t.toISOString().slice(11, 16);
}

/** Момент времени (UTC) для местной даты и времени суток. */
export function localDateTime(ymd: string, hhmm: string, offsetHours: number): Date {
  const utc = new Date(`${ymd}T${hhmm}:00.000Z`).getTime();
  return new Date(utc - offsetHours * 3600_000);
}
