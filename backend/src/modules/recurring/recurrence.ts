import { Frequency } from '@prisma/client';
import { addDays, isoWeekday, weeksBetween } from '../../common/utils/time';

/** Расписание правила в «календарных» строках YYYY-MM-DD — без часовых поясов. */
export interface RuleSchedule {
  frequency: Frequency;
  /** ISO: 1 = пн … 7 = вс */
  daysOfWeek: number[];
  dayOfMonth: number | null;
  startsOn: string;
  endsOn: string | null;
}

/** Выпадает ли поручение на эту дату. */
export function occursOn(rule: RuleSchedule, ymd: string): boolean {
  if (ymd < rule.startsOn) return false;
  if (rule.endsOn && ymd > rule.endsOn) return false;
  switch (rule.frequency) {
    case Frequency.WEEKLY:
      return rule.daysOfWeek.includes(isoWeekday(ymd));
    case Frequency.BIWEEKLY:
      // «Через неделю», считая от недели начала действия правила.
      return (
        rule.daysOfWeek.includes(isoWeekday(ymd)) && weeksBetween(rule.startsOn, ymd) % 2 === 0
      );
    case Frequency.MONTHLY:
      return Number(ymd.slice(8, 10)) === rule.dayOfMonth;
    default:
      return false;
  }
}

/** Все даты поручения в диапазоне [from, to] включительно. */
export function occurrencesBetween(rule: RuleSchedule, fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  for (let d = fromYmd; d <= toYmd; d = addDays(d, 1)) {
    if (occursOn(rule, d)) out.push(d);
  }
  return out;
}

/** Ближайшие count дат начиная с fromYmd (для «ближайшее регулярное поручение»). */
export function nextOccurrences(rule: RuleSchedule, fromYmd: string, count: number): string[] {
  const out: string[] = [];
  const limit = addDays(fromYmd, 400);
  for (let d = fromYmd; d <= limit && out.length < count; d = addDays(d, 1)) {
    if (rule.endsOn && d > rule.endsOn) break;
    if (occursOn(rule, d)) out.push(d);
  }
  return out;
}
