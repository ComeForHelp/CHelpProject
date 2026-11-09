'use client';

import { Box, Button, Container, Group, Paper, Stack, Text } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { useLogout } from '@/features/auth';
import { NotificationsButton } from '@/features/notifications';
import { ROLE_LABEL } from '@/shared/config/dictionaries';
import { useSession } from '@/shared/model/session';
import { FontSizeSwitcher } from '@/shared/ui';
import classes from './app-shell.module.css';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Подсвечивать только при точном совпадении (для главной раздела). */
  exact?: boolean;
}

/** Ждём восстановления сессии из localStorage, чтобы не мигать «выйти/войти». */
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/**
 * Header + навигация раздела. Никаких скрытых меню и свайпов:
 * все пункты видны кнопками с подписями, на телефоне переносятся на новую строку.
 */
export function AppLayout({
  nav,
  taskHref,
  size = 'md',
  showFontSwitcher = true,
  children,
}: {
  nav: NavItem[];
  taskHref: (taskId: string) => string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showFontSwitcher?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const user = useSession((s) => s.user);
  const logout = useLogout();
  const hydrated = useHydrated();

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Box className={classes.root}>
      <Paper component="header" className={classes.header} radius={0} shadow="xs">
        <Container size={size} py="sm">
          <Stack gap="sm">
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Link href="/" className={classes.logo}>
                Иду на помощь!
              </Link>
              <Group gap="sm" wrap="wrap">
                {showFontSwitcher && <FontSizeSwitcher />}
                {hydrated && user && <NotificationsButton taskHref={taskHref} />}
                <Button
                  variant="default"
                  size="md"
                  leftSection={<IconLogout size={20} aria-hidden />}
                  onClick={logout}
                >
                  Выйти
                </Button>
              </Group>
            </Group>
            {hydrated && user && (
              <Text c="dimmed" size="sm">
                {user.firstName} {user.lastName} · {ROLE_LABEL[user.role]}
              </Text>
            )}
            <Box component="nav" aria-label="Разделы" className={classes.nav}>
              {nav.map((item) => {
                const active = isActive(item);
                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    size="md"
                    variant={active ? 'filled' : 'light'}
                    leftSection={item.icon}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          </Stack>
        </Container>
      </Paper>
      <Container component="main" id="main" size={size} py="lg" className={classes.main}>
        {children}
      </Container>
    </Box>
  );
}
