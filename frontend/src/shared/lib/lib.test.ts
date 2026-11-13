import { resolveRedirect } from '../config/routes';
import {
  addDaysYmd,
  dayLabel,
  detectSlot,
  formatTime,
  formatWindow,
  isSlotAvailable,
  localToIso,
  slotWindow,
  toYmd,
} from './date';
import { formatMoney, formatPhone, isValidPhone, plural, shortName } from './format';

describe('resolveRedirect (middleware.ts)', () => {
  const guest = { authed: false };
  const recipient = { authed: true, role: 'RECIPIENT' };
  const admin = { authed: true, role: 'ADMIN' };

  it('без входа закрытый раздел ведёт на /login и помнит, куда шли', () => {
    expect(resolveRedirect('/my/tasks/new', guest)).toBe('/login?next=%2Fmy%2Ftasks%2Fnew');
  });

  it('публичные страницы открыты всем', () => {
    expect(resolveRedirect('/', guest)).toBeNull();
    expect(resolveRedirect('/login', guest)).toBeNull();
  });

  it('чужая роль отправляется в свой кабинет', () => {
    expect(resolveRedirect('/coord', recipient)).toBe('/my');
    expect(resolveRedirect('/volunteer/catalog', { authed: true, role: 'RELATIVE' })).toBe(
      '/family',
    );
  });

  it('администратор пользуется кабинетом координатора', () => {
    expect(resolveRedirect('/coord/reports', admin)).toBeNull();
  });

  it('вошедший пользователь со страницы входа уходит в кабинет', () => {
    expect(resolveRedirect('/login', recipient)).toBe('/my');
  });

  it('похожий по началу путь не считается разделом', () => {
    expect(resolveRedirect('/mystery', guest)).toBeNull();
  });

  it('подделанная роль в cookie = не вошёл', () => {
    expect(resolveRedirect('/my', { authed: true, role: 'HACKER' })).toBe('/login?next=%2Fmy');
  });
});

describe('время Владивостока (UTC+10)', () => {
  it('местное 09:00 → 23:00 UTC предыдущего дня', () => {
    expect(localToIso('2026-11-10', '09:00')).toBe('2026-11-09T23:00:00.000Z');
  });

  it('местная дата меняется в 14:00 UTC', () => {
    expect(toYmd('2026-11-09T13:59:00Z')).toBe('2026-11-09');
    expect(toYmd('2026-11-09T14:00:00Z')).toBe('2026-11-10');
  });

  it('показываем время по Владивостоку', () => {
    expect(formatTime('2026-11-09T23:00:00Z')).toBe('09:00');
  });

  it('окно «утро» и обратное определение слота', () => {
    const w = slotWindow('2026-11-10', 'morning');
    expect(w).toEqual({
      windowStart: '2026-11-09T23:00:00.000Z',
      windowEnd: '2026-11-10T02:00:00.000Z',
    });
    expect(detectSlot(w.windowStart)).toEqual({ ymd: '2026-11-10', part: 'morning' });
  });

  it('слот недоступен, если до конца меньше часа', () => {
    const now = new Date('2026-11-10T01:30:00Z'); // 11:30 во Владивостоке
    expect(isSlotAvailable('2026-11-10', 'morning', now)).toBe(false);
    expect(isSlotAvailable('2026-11-10', 'day', now)).toBe(true);
  });

  it('«Сегодня» и «Завтра» по местной дате', () => {
    const now = new Date('2026-11-09T20:00:00Z'); // уже 10 ноября во Владивостоке
    expect(dayLabel('2026-11-10', now)).toBe('Сегодня');
    expect(dayLabel('2026-11-11', now)).toBe('Завтра');
    expect(formatWindow('2026-11-10T23:00:00Z', '2026-11-11T02:00:00Z', now)).toBe(
      'Завтра, 09:00–12:00',
    );
  });

  it('переход через месяц и год', () => {
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('форматирование', () => {
  it('телефон', () => {
    expect(formatPhone('+79141234567')).toBe('+7 914 123-45-67');
    expect(isValidPhone('8 (914) 123-45-67')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });

  it('деньги и склонение', () => {
    expect(formatMoney(1200).replace(/\s/g, ' ')).toBe('1 200 ₽');
    expect(plural(1, ['заявка', 'заявки', 'заявок'])).toBe('заявка');
    expect(plural(3, ['заявка', 'заявки', 'заявок'])).toBe('заявки');
    expect(plural(11, ['заявка', 'заявки', 'заявок'])).toBe('заявок');
  });

  it('короткое имя', () => {
    expect(shortName({ lastName: 'Иванова', firstName: 'Мария', middleName: 'Петровна' })).toBe(
      'Иванова М. П.',
    );
    expect(shortName({ firstName: 'Мария' })).toBe('Мария');
  });
});
