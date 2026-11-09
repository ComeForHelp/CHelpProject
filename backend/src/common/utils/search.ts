import { Prisma } from '@prisma/client';

/**
 * Условие поиска пользователя по ФИО или телефону.
 * «Иванова Мария» ищет каждое слово в фамилии/имени/отчестве, цифры — в телефоне.
 */
export function userSearchWhere(q?: string): Prisma.UserWhereInput | undefined {
  const query = q?.trim();
  if (!query) return undefined;
  const words = query.split(/\s+/).filter(Boolean);
  const digits = query.replace(/\D/g, '');
  const or: Prisma.UserWhereInput[] = [
    {
      AND: words.map((w) => ({
        OR: [
          { lastName: { contains: w, mode: 'insensitive' as const } },
          { firstName: { contains: w, mode: 'insensitive' as const } },
          { middleName: { contains: w, mode: 'insensitive' as const } },
        ],
      })),
    },
  ];
  // Телефон хранится как +7XXXXXXXXXX: ведущую 8/7 у запроса отбрасываем.
  if (digits.length >= 3) {
    const tail = digits.length === 11 ? digits.slice(1) : digits;
    or.push({ phone: { contains: tail } });
  }
  return { OR: or };
}

/** «Иванова Мария Петровна» */
export function fullName(u: { lastName: string; firstName: string; middleName?: string | null }) {
  return [u.lastName, u.firstName, u.middleName].filter(Boolean).join(' ');
}
