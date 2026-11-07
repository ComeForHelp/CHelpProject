import { ConflictException, ForbiddenException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import {
  TASK_TRANSITIONS,
  assertTransition,
  availableTransitions,
  canTransition,
} from './task-status.machine';

const { NEW, ASSIGNED, IN_PROGRESS, DONE, CONFIRMED, CANCELLED, EXPIRED } = TaskStatus;

describe('task-status.machine', () => {
  it('проходит основной путь NEW → CONFIRMED', () => {
    expect(canTransition(NEW, ASSIGNED, 'VOLUNTEER')).toBe(true);
    expect(canTransition(ASSIGNED, IN_PROGRESS, 'VOLUNTEER')).toBe(true);
    expect(canTransition(IN_PROGRESS, DONE, 'VOLUNTEER')).toBe(true);
    expect(canTransition(DONE, CONFIRMED, 'OWNER')).toBe(true);
  });

  it('закрыть заявку может только получатель или координатор, не волонтёр', () => {
    expect(canTransition(DONE, CONFIRMED, 'VOLUNTEER')).toBe(false);
    expect(canTransition(DONE, CONFIRMED, 'STAFF')).toBe(true);
  });

  it('отменить можно только до начала выполнения', () => {
    expect(canTransition(NEW, CANCELLED, 'OWNER')).toBe(true);
    expect(canTransition(ASSIGNED, CANCELLED, 'OWNER')).toBe(true);
    expect(canTransition(IN_PROGRESS, CANCELLED, 'OWNER')).toBe(false);
    expect(canTransition(DONE, CANCELLED, 'STAFF')).toBe(false);
  });

  it('волонтёр отказался — заявка возвращается в каталог', () => {
    expect(canTransition(ASSIGNED, NEW, 'VOLUNTEER')).toBe(true);
    expect(canTransition(ASSIGNED, NEW, 'OWNER')).toBe(false);
  });

  it('в EXPIRED переводит только cron', () => {
    expect(canTransition(NEW, EXPIRED, 'SYSTEM')).toBe(true);
    expect(canTransition(NEW, EXPIRED, 'STAFF')).toBe(false);
    expect(canTransition(ASSIGNED, EXPIRED, 'SYSTEM')).toBe(false);
  });

  it('из финальных статусов выхода нет', () => {
    for (const s of [CONFIRMED, CANCELLED, EXPIRED]) {
      expect(TASK_TRANSITIONS.filter((t) => t.from === s)).toHaveLength(0);
    }
  });

  it('получатель не может сам взять или выполнить заявку', () => {
    expect(availableTransitions(NEW, 'OWNER')).toEqual([CANCELLED]);
    expect(availableTransitions(IN_PROGRESS, 'OWNER')).toEqual([]);
  });

  it('assertTransition: 409 для несуществующего перехода, 403 для чужого', () => {
    expect(() => assertTransition(IN_PROGRESS, CANCELLED, 'OWNER')).toThrow(ConflictException);
    expect(() => assertTransition(NEW, ASSIGNED, 'OWNER')).toThrow(ForbiddenException);
    expect(() => assertTransition(NEW, ASSIGNED, 'VOLUNTEER')).not.toThrow();
  });
});
