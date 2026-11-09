import { Prisma } from '@prisma/client';
import { TaskRelation } from '../../common/access/access.service';
import { TaskActor, availableTransitions } from './task-status.machine';

/**
 * Что видит каждый участник (раздел 8 документа, «Карточка поручения: что видно и когда»).
 * До взятия заявки волонтёр видит только район и улицу без номера дома, имя без фамилии,
 * без телефонов и особенностей получателя — это защищает пожилых людей.
 */

const personShort = { id: true, firstName: true, lastName: true } satisfies Prisma.UserSelect;

export const taskListInclude = {
  category: true,
  address: { select: { district: true, street: true, floor: true, hasElevator: true } },
  recipient: { select: personShort },
  volunteer: { select: personShort },
  _count: { select: { items: true } },
} satisfies Prisma.TaskInclude;

export const taskDetailInclude = {
  category: true,
  address: { include: { district: true } },
  items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
  recipient: {
    select: {
      ...personShort,
      middleName: true,
      phone: true,
      recipientProfile: { select: { mobilityNotes: true, contactPreference: true } },
    },
  },
  volunteer: {
    select: {
      ...personShort,
      middleName: true,
      phone: true,
      volunteerProfile: { select: { ratingAvg: true, tasksDone: true, hasCar: true } },
    },
  },
  createdBy: { select: { ...personShort, role: true } },
  attachments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      kind: true,
      mimeType: true,
      sizeBytes: true,
      originalName: true,
      createdAt: true,
      uploadedById: true,
    },
  },
  reviews: {
    select: {
      id: true,
      authorId: true,
      targetId: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  },
  recurringRule: { select: { id: true, title: true, frequency: true } },
} satisfies Prisma.TaskInclude;

export type TaskListRow = Prisma.TaskGetPayload<{ include: typeof taskListInclude }>;
export type TaskDetailRow = Prisma.TaskGetPayload<{ include: typeof taskDetailInclude }>;

export function relationToActor(relation: TaskRelation): TaskActor | null {
  return relation === 'CATALOG' ? null : relation;
}

/** Карточка в каталоге (CatalogTaskCard): только район, число позиций, значок «без лифта». */
export function presentCatalogCard(t: TaskListRow) {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    urgency: t.urgency,
    windowStart: t.windowStart,
    windowEnd: t.windowEnd,
    category: t.category,
    district: t.address.district,
    noElevator: (t.address.floor ?? 0) > 1 && !t.address.hasElevator,
    floor: t.address.floor,
    estimatedCost: t.estimatedCost,
    paymentMethod: t.paymentMethod,
    itemsCount: t._count.items,
    createdAt: t.createdAt,
  };
}

/** Строка списка для получателя, родственника, волонтёра и координатора (TaskCard). */
export function presentListCard(t: TaskListRow) {
  return {
    ...presentCatalogCard(t),
    street: t.address.street,
    recipient: t.recipient,
    volunteer: t.volunteer,
    recurringRuleId: t.recurringRuleId,
    acceptedAt: t.acceptedAt,
    doneAt: t.doneAt,
    confirmedAt: t.confirmedAt,
    cancelledAt: t.cancelledAt,
  };
}

export interface DetailExtras {
  /** Телефоны подтверждённых родственников — для назначенного волонтёра и координатора. */
  relatives?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    relation: string | null;
  }>;
  viewerId: string;
}

/** Полная карточка (TaskDetails): поля и кнопки зависят от роли и статуса. */
export function presentTaskDetail(t: TaskDetailRow, relation: TaskRelation, extras: DetailExtras) {
  const base = {
    id: t.id,
    title: t.title,
    description: t.description,
    destination: t.destination,
    status: t.status,
    urgency: t.urgency,
    windowStart: t.windowStart,
    windowEnd: t.windowEnd,
    estimatedCost: t.estimatedCost,
    paymentMethod: t.paymentMethod,
    category: t.category,
    items: t.items,
    createdAt: t.createdAt,
    viewerRelation: relation,
    availableTransitions: (() => {
      const actor = relationToActor(relation);
      return actor ? availableTransitions(t.status, actor) : [];
    })(),
  };

  if (relation === 'CATALOG') {
    return {
      ...base,
      // Этаж и лифт видны сразу, а квартира, подъезд и подсказки (там бывает код домофона) — после взятия.
      address: {
        district: t.address.district,
        street: t.address.street,
        floor: t.address.floor,
        hasElevator: t.address.hasElevator,
      },
      recipient: { firstName: t.recipient.firstName },
      canTake: true,
    };
  }

  const isStaffOrVolunteer = relation === 'STAFF' || relation === 'VOLUNTEER';
  const { recipientProfile, ...recipient } = t.recipient;
  const volunteer = t.volunteer && {
    id: t.volunteer.id,
    firstName: t.volunteer.firstName,
    lastName: t.volunteer.lastName,
    middleName: t.volunteer.middleName,
    phone: t.volunteer.phone,
    ratingAvg: t.volunteer.volunteerProfile?.ratingAvg ?? null,
    tasksDone: t.volunteer.volunteerProfile?.tasksDone ?? null,
    hasCar: t.volunteer.volunteerProfile?.hasCar ?? null,
  };

  return {
    ...base,
    address: t.address,
    recipient: {
      ...recipient,
      mobilityNotes: recipientProfile?.mobilityNotes ?? null,
      contactPreference: recipientProfile?.contactPreference ?? null,
    },
    relatives: isStaffOrVolunteer ? (extras.relatives ?? []) : undefined,
    volunteer,
    createdBy: t.createdBy,
    recurringRule: t.recurringRule,
    attachments: t.attachments,
    reviews: t.reviews,
    myReview: t.reviews.find((r) => r.authorId === extras.viewerId) ?? null,
    acceptedAt: t.acceptedAt,
    startedAt: t.startedAt,
    doneAt: t.doneAt,
    confirmedAt: t.confirmedAt,
    cancelledAt: t.cancelledAt,
    cancelReason: t.cancelReason,
    updatedAt: t.updatedAt,
  };
}
