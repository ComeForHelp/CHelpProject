import type { components } from './schema';

/** Схемы API, сгенерированные из Swagger backend (npm run api:types). */
export type S = components['schemas'];

export type Role = S['Role'];
export type TaskStatus = S['TaskStatus'];
export type Urgency = S['Urgency'];
export type PaymentMethod = S['PaymentMethod'];
export type Frequency = S['Frequency'];
export type AttachmentKind = S['AttachmentKind'];
export type VerificationStatus = S['VerificationStatus'];
export type LinkStatus = S['LinkStatus'];
export type ContactPreference = S['ContactPreference'];
export type TaskRelation = S['TaskRelation'];

/** Ответ списков: { items, total, page, limit }. */
export type Paginated<T> = S['PaginatedDto'] & { items: T[] };
