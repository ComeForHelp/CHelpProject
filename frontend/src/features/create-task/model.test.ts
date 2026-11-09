import type { S } from '@/shared/api/types';
import { addDaysYmd, todayYmd } from '@/shared/lib/date';
import { type TaskDraft, draftToPayload, emptyDraft, stepsFor, validateStep } from './model';

const groceries: S['CategoryDto'] = {
  id: 1,
  code: 'groceries',
  name: 'Продукты',
  icon: null,
  needsMoney: true,
  sortOrder: 1,
};
const escort: S['CategoryDto'] = {
  id: 4,
  code: 'escort',
  name: 'Сопровождение',
  icon: null,
  needsMoney: false,
  sortOrder: 4,
};

const tomorrow = addDaysYmd(todayYmd(), 1);
const full = (patch: Partial<TaskDraft> = {}): TaskDraft => ({
  ...emptyDraft(),
  categoryId: 1,
  title: 'Купить продукты',
  items: [
    { name: 'Хлеб', quantity: '1' },
    { name: '  ', quantity: '' },
  ],
  ymd: tomorrow,
  part: 'morning',
  addressId: 'a1',
  paymentMethod: 'CASH_ON_DELIVERY',
  ...patch,
});

describe('шаги мастера заявки', () => {
  it('оплата есть только там, где что-то покупают', () => {
    expect(stepsFor(groceries)).toEqual([
      'category',
      'details',
      'time',
      'address',
      'payment',
      'review',
    ]);
    expect(stepsFor(escort)).toEqual(['category', 'details', 'time', 'address', 'review']);
  });

  it('каждый шаг объясняет, что не так', () => {
    expect(validateStep('category', emptyDraft())).toBe('Выберите, что нужно сделать');
    expect(validateStep('details', full({ title: '  ' }))).toMatch(/Напишите/);
    expect(validateStep('time', full({ part: undefined }))).toBe('Выберите время дня');
    expect(validateStep('address', full({ addressId: undefined }))).toMatch(/адрес/);
    expect(validateStep('payment', full({ paymentMethod: undefined }))).toMatch(/оплаты/);
    expect(validateStep('time', full())).toBeNull();
  });

  it('прошедшее время не пропускает', () => {
    const late = new Date(`${tomorrow}T03:30:00Z`); // 13:30 завтра по Владивостоку
    expect(validateStep('time', full(), late)).toMatch(/уже прошло/);
  });
});

describe('черновик → запрос POST /tasks', () => {
  it('пустые строки списка отбрасываются, время — по Владивостоку', () => {
    const body = draftToPayload(full({ urgent: true, estimatedCost: 800 }), groceries, 'r1');
    expect(body.items).toEqual([{ name: 'Хлеб', quantity: '1' }]);
    expect(body.urgency).toBe('URGENT');
    expect(body.recipientId).toBe('r1');
    expect(body.estimatedCost).toBe(800);
    expect(body.windowStart).toBe(new Date(`${tomorrow}T09:00:00+10:00`).toISOString());
  });

  it('без покупки — без денег', () => {
    const body = draftToPayload(
      full({ categoryId: 4, paymentMethod: 'TRANSFER', estimatedCost: 500 }),
      escort,
    );
    expect(body.paymentMethod).toBe('NONE');
    expect(body.estimatedCost).toBeUndefined();
  });

  it('незаполненный черновик не отправляется', () => {
    expect(() => draftToPayload(emptyDraft(), groceries)).toThrow();
  });
});
