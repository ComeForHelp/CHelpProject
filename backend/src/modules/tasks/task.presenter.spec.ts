import { TaskStatus } from '@prisma/client';
import { contactsVisible } from './task.presenter';

describe('contactsVisible — кто видит контакты другой стороны', () => {
  it('координатор видит всегда', () => {
    for (const s of Object.values(TaskStatus)) expect(contactsVisible('STAFF', s)).toBe(true);
  });

  it('каталог — никогда', () => {
    expect(contactsVisible('CATALOG', TaskStatus.NEW)).toBe(false);
  });

  it('волонтёр видит, пока заявка у него в работе', () => {
    expect(contactsVisible('VOLUNTEER', TaskStatus.ASSIGNED)).toBe(true);
    expect(contactsVisible('VOLUNTEER', TaskStatus.IN_PROGRESS)).toBe(true);
    expect(contactsVisible('VOLUNTEER', TaskStatus.DONE)).toBe(true);
  });

  it('после закрытия или отмены контакты скрываются и у волонтёра, и у получателя', () => {
    for (const s of [TaskStatus.CONFIRMED, TaskStatus.CANCELLED, TaskStatus.EXPIRED]) {
      expect(contactsVisible('VOLUNTEER', s)).toBe(false);
      expect(contactsVisible('OWNER', s)).toBe(false);
    }
  });
});
