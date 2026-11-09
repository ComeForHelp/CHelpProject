/** Ключи совпадают с фильтрами GET /tasks — клик по счётчику ведёт в отфильтрованную таблицу. */
export class DashboardDto {
  /** Без волонтёра: ?status=NEW */
  unassigned: number;
  /** Срочные без волонтёра: ?status=NEW&urgency=URGENT */
  urgent: number;
  /** Окно прошло, а заявка не выполнена: ?overdue=true */
  overdue: number;
  /** В работе: ?status=ASSIGNED,IN_PROGRESS */
  inProgress: number;
  /** Выполнены, ждут подтверждения: ?status=DONE */
  awaitingConfirmation: number;
  /** Волонтёры на проверке: /volunteers?status=PENDING */
  pendingVolunteers: number;
  /** Просрочено за сутки: ?status=EXPIRED */
  expiredLast24h: number;
}

export class RoleCountsDto {
  RECIPIENT: number;
  RELATIVE: number;
  VOLUNTEER: number;
  COORDINATOR: number;
  ADMIN: number;
}

export class StatusCountsDto {
  NEW: number;
  ASSIGNED: number;
  IN_PROGRESS: number;
  DONE: number;
  CONFIRMED: number;
  CANCELLED: number;
  EXPIRED: number;
}

export class ReportPeriodDto {
  from: Date;
  to: Date;
}

export class ReportUsersDto {
  /** Активные пользователи на сегодня */
  activeByRole: RoleCountsDto;
  /** Зарегистрированы за период */
  newByRole: RoleCountsDto;
  volunteersVerified: number;
  /** Волонтёры, бравшие заявки за период */
  volunteersActiveInPeriod: number;
}

export class ReportCategoryDto {
  categoryId: number;
  name: string;
  total: number;
}

export class ReportDistrictDto {
  districtId: number;
  name: string;
  total: number;
  /** DONE + CONFIRMED */
  completed: number;
}

export class ReportTasksDto {
  /** Создано за период */
  total: number;
  byStatus: StatusCountsDto;
  /** DONE + CONFIRMED */
  completed: number;
  /** Доля выполненных от всех созданных, % */
  completionRate: number | null;
  /** Доля выполненных среди закрытых (без ещё открытых), % */
  completionRateOfClosed: number | null;
  byCategory: ReportCategoryDto[];
  byDistrict: ReportDistrictDto[];
}

export class ReportTimingDto {
  /** Среднее время от создания до отклика волонтёра, мин */
  avgResponseMinutes: number | null;
  /** От отклика до «Выполнено», мин */
  avgCompletionMinutes: number | null;
  /** От «Выполнено» до подтверждения получателем, мин */
  avgConfirmMinutes: number | null;
}

export class ReportReviewsDto {
  count: number;
  /** 1–5 */
  avgRating: number | null;
}

/** Метрики пилота (задача 11) */
export class ReportDto {
  period: ReportPeriodDto;
  users: ReportUsersDto;
  tasks: ReportTasksDto;
  timing: ReportTimingDto;
  reviews: ReportReviewsDto;
}
