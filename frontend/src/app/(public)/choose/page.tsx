import { Stack, Text } from '@mantine/core';
import { IconHeart, IconUser, IconWalk } from '@tabler/icons-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FormColumn, publicClasses as c } from '@/widgets/public-shell';

export const metadata: Metadata = { title: 'Выбор варианта' };

const OPTIONS = [
  {
    role: 'RECIPIENT',
    icon: IconUser,
    title: 'Мне нужна помощь',
    text: 'Я хочу оставлять заявки на бытовые поручения.',
  },
  {
    role: 'RELATIVE',
    icon: IconHeart,
    title: 'Помогаю близкому',
    text: 'Я оформляю помощь для родственника.',
  },
  {
    role: 'VOLUNTEER',
    icon: IconWalk,
    title: 'Хочу помогать',
    text: 'Я хочу выполнять поручения как волонтёр.',
  },
];

export default function ChoosePage() {
  return (
    <FormColumn
      title="Как вы хотите использовать сервис?"
      description="Выберите подходящий вариант. Позже это можно уточнить."
    >
      <Stack gap="sm">
        {OPTIONS.map(({ role, icon: Icon, title, text }) => (
          <Link key={role} href={`/register?role=${role}`} className={c.option}>
            <span className={c.iconBox} style={{ margin: 0 }} aria-hidden>
              <Icon size={24} stroke={1.8} />
            </span>
            <Stack gap={2}>
              <Text fw={700} fz="1.15rem" ff="heading">
                {title}
              </Text>
              <Text c="dimmed">{text}</Text>
            </Stack>
          </Link>
        ))}
        <Text mt="sm">
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </Text>
      </Stack>
    </FormColumn>
  );
}
