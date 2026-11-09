'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PaymentMethod, S } from '@/shared/api/types';
import { type DayPart, isSlotAvailable, slotWindow } from '@/shared/lib/date';

export interface DraftItem {
  name: string;
  quantity: string;
}

/** Черновик заявки. Сохраняется в браузере — если закрыть страницу, ничего не потеряется. */
export interface TaskDraft {
  step: number;
  categoryId?: number;
  title: string;
  description: string;
  destination: string;
  items: DraftItem[];
  ymd?: string;
  part?: DayPart;
  urgent: boolean;
  addressId?: string;
  paymentMethod?: PaymentMethod;
  estimatedCost?: number | null;
}

export const emptyDraft = (): TaskDraft => ({
  step: 0,
  title: '',
  description: '',
  destination: '',
  items: [{ name: '', quantity: '' }],
  urgent: false,
});

interface DraftState {
  drafts: Record<string, TaskDraft>;
  update: (key: string, patch: Partial<TaskDraft>) => void;
  reset: (key: string) => void;
}

/** Черновики по получателю: у родственника — свой для каждого подопечного. */
export const useTaskDrafts = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      update: (key, patch) =>
        set((s) => ({
          drafts: { ...s.drafts, [key]: { ...(s.drafts[key] ?? emptyDraft()), ...patch } },
        })),
      reset: (key) =>
        set((s) => {
          const drafts = { ...s.drafts };
          delete drafts[key];
          return { drafts };
        }),
    }),
    { name: 'chp-task-drafts', storage: createJSONStorage(() => localStorage) },
  ),
);

export type StepId = 'category' | 'details' | 'time' | 'address' | 'payment' | 'review';

export const STEP_TITLES: Record<StepId, string> = {
  category: 'Что нужно сделать?',
  details: 'Подробности',
  time: 'Когда?',
  address: 'Куда прийти?',
  payment: 'Как оплатить покупку?',
  review: 'Проверьте заявку',
};

/** Шаг оплаты нужен только там, где волонтёр что-то покупает. */
export function stepsFor(category?: S['CategoryDto']): StepId[] {
  const steps: StepId[] = ['category', 'details', 'time', 'address'];
  if (!category || category.needsMoney) steps.push('payment');
  steps.push('review');
  return steps;
}

/** Проверка шага: текст ошибки или null. */
export function validateStep(step: StepId, d: TaskDraft, now: Date = new Date()): string | null {
  switch (step) {
    case 'category':
      return d.categoryId ? null : 'Выберите, что нужно сделать';
    case 'details':
      if (!d.title.trim()) return 'Напишите коротко, что нужно сделать';
      if (d.title.trim().length > 200) return 'Слишком длинный заголовок';
      return null;
    case 'time':
      if (!d.ymd) return 'Выберите день';
      if (!d.part) return 'Выберите время дня';
      if (!isSlotAvailable(d.ymd, d.part, now)) return 'Это время уже прошло — выберите другое';
      return null;
    case 'address':
      return d.addressId ? null : 'Выберите адрес или добавьте новый';
    case 'payment':
      return d.paymentMethod ? null : 'Выберите способ оплаты';
    case 'review':
      return null;
  }
}

/** Черновик → тело запроса POST /tasks. */
export function draftToPayload(
  d: TaskDraft,
  category: S['CategoryDto'] | undefined,
  recipientId?: string,
): S['CreateTaskDto'] {
  if (!d.categoryId || !d.ymd || !d.part || !d.addressId) {
    throw new Error('Заявка заполнена не полностью');
  }
  const items = d.items
    .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim() }))
    .filter((i) => i.name)
    .map((i) => ({ name: i.name, quantity: i.quantity || undefined }));
  const needsMoney = category?.needsMoney ?? false;
  return {
    recipientId,
    categoryId: d.categoryId,
    addressId: d.addressId,
    title: d.title.trim(),
    description: d.description.trim() || undefined,
    destination: d.destination.trim() || undefined,
    urgency: d.urgent ? 'URGENT' : 'NORMAL',
    ...slotWindow(d.ymd, d.part),
    estimatedCost: needsMoney && d.estimatedCost ? d.estimatedCost : undefined,
    paymentMethod: needsMoney ? (d.paymentMethod ?? 'CASH_ON_DELIVERY') : 'NONE',
    items: items.length ? items : undefined,
  };
}
