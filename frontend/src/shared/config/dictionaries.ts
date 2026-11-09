import type {
  AttachmentKind,
  ContactPreference,
  Frequency,
  PaymentMethod,
  Role,
  TaskStatus,
  VerificationStatus,
} from '../api/types';

/** Понятные слова вместо терминов (требование ТЗ: «Взяли в работу», а не «ASSIGNED»). */
export const TASK_STATUS: Record<TaskStatus, { label: string; color: string; short: string }> = {
  NEW: { label: 'Ждёт волонтёра', short: 'Создана', color: 'blue' },
  ASSIGNED: { label: 'Волонтёр взял', short: 'Взяли', color: 'violet' },
  IN_PROGRESS: { label: 'Выполняется', short: 'В пути', color: 'orange' },
  DONE: { label: 'Выполнена — подтвердите', short: 'Выполнена', color: 'teal' },
  CONFIRMED: { label: 'Принята', short: 'Принята', color: 'green' },
  CANCELLED: { label: 'Отменена', short: 'Отменена', color: 'gray' },
  EXPIRED: { label: 'Не взята в срок', short: 'Истекла', color: 'red' },
};

export const PAYMENT_METHOD: Record<PaymentMethod, { label: string; hint: string }> = {
  CASH_ON_DELIVERY: {
    label: 'Наличными при получении',
    hint: 'Отдам деньги, когда принесут покупки',
  },
  TRANSFER: { label: 'Переводом', hint: 'Переведу деньги по номеру телефона' },
  PREPAID: { label: 'Дам деньги заранее', hint: 'Волонтёр заберёт деньги перед покупкой' },
  NONE: { label: 'Покупать ничего не нужно', hint: 'Деньги не понадобятся' },
};

export const FREQUENCY: Record<Frequency, string> = {
  WEEKLY: 'Каждую неделю',
  BIWEEKLY: 'Через неделю',
  MONTHLY: 'Раз в месяц',
};

/** ISO-дни недели: 1 = понедельник … 7 = воскресенье. */
export const WEEKDAYS = [
  { value: 1, short: 'Пн', long: 'понедельник' },
  { value: 2, short: 'Вт', long: 'вторник' },
  { value: 3, short: 'Ср', long: 'среда' },
  { value: 4, short: 'Чт', long: 'четверг' },
  { value: 5, short: 'Пт', long: 'пятница' },
  { value: 6, short: 'Сб', long: 'суббота' },
  { value: 7, short: 'Вс', long: 'воскресенье' },
] as const;

export const ROLE_LABEL: Record<Role, string> = {
  RECIPIENT: 'Получатель помощи',
  RELATIVE: 'Родственник',
  VOLUNTEER: 'Волонтёр',
  COORDINATOR: 'Координатор',
  ADMIN: 'Администратор',
};

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; color: string }> = {
  PENDING: { label: 'На проверке', color: 'yellow' },
  VERIFIED: { label: 'Проверен', color: 'green' },
  REJECTED: { label: 'Отклонён', color: 'red' },
  BLOCKED: { label: 'Заблокирован', color: 'gray' },
};

export const CONTACT_PREFERENCE: Record<ContactPreference, string> = {
  CALL: 'Звонить по телефону',
  MESSAGE: 'Писать сообщения',
};

export const ATTACHMENT_KIND: Record<AttachmentKind, string> = {
  RECEIPT: 'Чек',
  PRESCRIPTION: 'Рецепт',
  PHOTO: 'Фото',
};
