'use client';

import {
  IconDots,
  IconPackage,
  IconPill,
  IconReceipt,
  IconShoppingCart,
  IconWalk,
  type IconProps,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { api } from '@/shared/api/client';
import type { S } from '@/shared/api/types';

export type Category = S['CategoryDto'];

export function useCategories() {
  return useQuery({
    queryKey: ['dictionaries', 'categories'],
    queryFn: async () => (await api.get<Category[]>('/dictionaries/categories')).data,
    staleTime: Infinity,
  });
}

const ICONS: Record<string, ComponentType<IconProps>> = {
  groceries: IconShoppingCart,
  medicine: IconPill,
  utilities: IconReceipt,
  escort: IconWalk,
  delivery: IconPackage,
  other: IconDots,
};

/** Иконка категории по её коду (groceries, medicine…). */
export function CategoryIcon({ code, size = 28 }: { code: string; size?: number }) {
  const Icon = ICONS[code] ?? IconDots;
  return <Icon size={size} stroke={1.8} aria-hidden />;
}

/** Нужен ли список покупок: продукты, лекарства. */
export function categoryHasList(code: string | undefined): boolean {
  return code === 'groceries' || code === 'medicine';
}

/** Заголовок заявки по умолчанию для категории. */
export const CATEGORY_DEFAULT_TITLE: Record<string, string> = {
  groceries: 'Купить продукты',
  medicine: 'Купить лекарства',
  utilities: 'Оплатить ЖКХ',
  escort: 'Сопроводить',
  delivery: 'Доставить',
  other: 'Помочь',
};
