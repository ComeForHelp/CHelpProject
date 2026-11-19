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

/** Подсказки в форме заявки — свои для каждой категории, а не «хлеб» везде. */
export const CATEGORY_HINTS: Record<
  string,
  { description: string; item?: string; quantity?: string }
> = {
  groceries: {
    description: 'Например: хлеб нарезанный, молоко 2,5%, можно заменить на похожее',
    item: 'Хлеб бородинский',
    quantity: '2 шт',
  },
  medicine: {
    description: 'Например: рецепт у меня на руках, лучше в аптеке у дома',
    item: 'Ибупрофен 200 мг',
    quantity: '1 упак.',
  },
  utilities: { description: 'Например: квитанции за свет и воду лежат на тумбочке у двери' },
  escort: { description: 'Например: хожу медленно, нужна помощь на лестнице' },
  delivery: { description: 'Например: забрать посылку на почте и принести домой' },
  other: { description: 'Опишите, что нужно сделать' },
};
