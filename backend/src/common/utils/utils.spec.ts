import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertDecimals } from '../interceptors/decimal.interceptor';
import { detectMime } from '../../modules/attachments/file-signature';
import { normalizePhone } from './phone';
import {
  addDays,
  isoWeekday,
  localDateString,
  localDateTime,
  timeOfDay,
  timeToString,
} from './time';

describe('normalizePhone', () => {
  it.each([
    ['8 (914) 123-45-67', '+79141234567'],
    ['+7 914 1234567', '+79141234567'],
    ['9141234567', '+79141234567'],
  ])('%s → %s', (input, expected) => expect(normalizePhone(input)).toBe(expected));

  it('отклоняет короткий номер', () => {
    expect(() => normalizePhone('12345')).toThrow(BadRequestException);
  });
});

describe('time (Владивосток, UTC+10)', () => {
  it('местная дата меняется в 14:00 UTC', () => {
    expect(localDateString(new Date('2026-11-07T13:59:00Z'), 10)).toBe('2026-11-07');
    expect(localDateString(new Date('2026-11-07T14:00:00Z'), 10)).toBe('2026-11-08');
  });

  it('местное 10:00 → 00:00 UTC', () => {
    expect(localDateTime('2026-11-10', '10:00', 10).toISOString()).toBe('2026-11-10T00:00:00.000Z');
  });

  it('дни недели и сдвиг дат', () => {
    expect(isoWeekday('2026-11-09')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('время суток туда и обратно', () => {
    expect(timeToString(timeOfDay('09:30'))).toBe('09:30');
  });
});

describe('convertDecimals', () => {
  it('Decimal → number, даты не трогает', () => {
    const d = new Date();
    expect(
      convertDecimals({
        cost: new Prisma.Decimal('350.50'),
        at: d,
        list: [{ r: new Prisma.Decimal(4) }],
      }),
    ).toEqual({ cost: 350.5, at: d, list: [{ r: 4 }] });
  });
});

describe('detectMime', () => {
  const pad = (b: number[]) => Buffer.concat([Buffer.from(b), Buffer.alloc(16)]);
  it('распознаёт JPEG, PNG и PDF', () => {
    expect(detectMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectMime(Buffer.from('%PDF-1.7 ................'))).toBe('application/pdf');
  });
  it('отклоняет исполняемый файл под видом картинки', () => {
    expect(detectMime(Buffer.from('MZ\x90\x00 this is not an image'))).toBeNull();
  });
});
