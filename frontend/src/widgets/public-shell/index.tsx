import {
  Anchor,
  Box,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui';
import classes from './public-shell.module.css';

export { classes as publicClasses };

const SECTIONS = [
  { href: '/#how', label: 'Как это работает' },
  { href: '/#who', label: 'Кому помогаем' },
  { href: '/#vol', label: 'Стать волонтёром' },
];

/** Публичная часть по макету: шапка с якорями, «Войти», «Получить помощь» и тёмный подвал. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <Box className={classes.root}>
      <header className={classes.header}>
        <Container size={1248} px={{ base: 16, sm: 24 }} h="100%">
          <Group justify="space-between" wrap="nowrap" h="100%" gap="sm">
            <Logo />
            <Group
              gap={4}
              wrap="nowrap"
              component="nav"
              aria-label="Разделы сайта"
              visibleFrom="md"
            >
              {SECTIONS.map((s) => (
                <Link key={s.href} href={s.href} className={classes.navLink}>
                  {s.label}
                </Link>
              ))}
            </Group>
            <Group gap="xs" wrap="nowrap">
              <Button component={Link} href="/login" variant="subtle" size="md">
                Войти
              </Button>
              {/* На телефоне не помещается — там «Мне нужна помощь» первым экраном главной */}
              <Button component={Link} href="/choose" variant="light" size="md" visibleFrom="xs">
                Получить помощь
              </Button>
            </Group>
          </Group>
        </Container>
      </header>

      <main id="main">{children}</main>

      <footer className={classes.footer}>
        <Container size={1248} px={24}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            <Stack gap="sm">
              <Logo light />
              <Text c="#DCE4E0">
                Бытовая помощь
                <br />
                во Владивостоке
              </Text>
            </Stack>
            <Stack gap={6}>
              <Title order={4} c="white">
                Сервис
              </Title>
              {SECTIONS.map((s) => (
                <Anchor key={s.href} component={Link} href={s.href} className={classes.footLink}>
                  {s.label}
                </Anchor>
              ))}
            </Stack>
            <Stack gap={6}>
              <Title order={4} c="white">
                Помощь по телефону
              </Title>
              <Text c="#DCE4E0">г. Владивосток</Text>
              <Text c="#DCE4E0">
                Нет интернета или трудно пользоваться сайтом — координатор примет заявку по
                телефону.
              </Text>
            </Stack>
            <Stack gap={6}>
              <Title order={4} c="white">
                Документы
              </Title>
              <Anchor component={Link} href="/privacy" className={classes.footLink}>
                Политика обработки персональных данных
              </Anchor>
            </Stack>
          </SimpleGrid>
          <Text size="sm" c="#A9B7B0" mt={40}>
            «Иду на помощь!» — пилотный проект, Владивосток.
          </Text>
        </Container>
      </footer>
    </Box>
  );
}

/** Узкая колонка для форм входа и регистрации — как в макете, без карточки. */
export function FormColumn({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Container size={560} py={{ base: 32, sm: 56 }} px="md">
      <Stack gap="xs" mb="lg">
        <Title order={1}>{title}</Title>
        {description && <Text c="dimmed">{description}</Text>}
      </Stack>
      {children}
    </Container>
  );
}
