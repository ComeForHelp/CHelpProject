'use client';

import { Box, Button, Divider, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { useLogout } from '@/features/auth';
import { NotificationsButton } from '@/features/notifications';
import { ROLE_LABEL } from '@/shared/config/dictionaries';
import { useSession } from '@/shared/model/session';
import { FontSizeSwitcher, Logo } from '@/shared/ui';
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
 * Каркас кабинетов по макету: шапка, слева меню (на компьютере),
 * внизу панель вкладок (на телефоне). Меню всегда видно — никаких скрытых меню (ТЗ).
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

  const links = (variant: 'side' | 'tab') =>
    nav.map((item) => {
      const active = isActive(item);
      return (
        <Link
          key={item.href}
          href={item.href}
          className={variant === 'side' ? classes.sideLink : classes.tabLink}
          data-active={active || undefined}
          aria-current={active ? 'page' : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <Box className={classes.root}>
      <header className={classes.header}>
        <Group justify="space-between" wrap="nowrap" gap="sm" h="100%" px="md">
          <Logo href={nav[0]?.href ?? '/'} />
          <Group gap="xs" wrap="nowrap">
            {hydrated && user && <NotificationsButton taskHref={taskHref} />}
            {hydrated && user && (
              <Group gap={8} wrap="nowrap" className={classes.userChip}>
                <span className={classes.avatar} aria-hidden>
                  <IconUser size={18} />
                </span>
                <Text fw={600} size="sm" truncate maw={180}>
                  {user.lastName} {user.firstName}
                </Text>
              </Group>
            )}
            <Button
              variant="default"
              size="md"
              onClick={logout}
              leftSection={<IconLogout size={18} aria-hidden />}
              className={classes.logout}
            >
              Выйти
            </Button>
          </Group>
        </Group>
      </header>

      <div className={classes.shell}>
        <aside className={classes.side} aria-label="Меню">
          <div className={classes.sideInner}>
            <nav aria-label="Разделы">
              <Stack gap={4}>{links('side')}</Stack>
            </nav>
            {showFontSwitcher && (
              <>
                <Divider my="md" color="ink.2" />
                <Text size="sm" c="dimmed" fw={600} mb={6} px={4}>
                  Размер шрифта
                </Text>
                <FontSizeSwitcher />
              </>
            )}
            {hydrated && user && (
              <>
                <Divider my="md" color="ink.2" />
                <Text size="sm" c="dimmed" px={4}>
                  {user.firstName} {user.lastName}
                  <br />
                  {ROLE_LABEL[user.role]}
                </Text>
              </>
            )}
          </div>
        </aside>

        <main id="main" className={classes.main} data-size={size}>
          <div className={classes.content}>{children}</div>
        </main>
      </div>

      {/* Телефон: вкладки внизу экрана, у каждой — иконка и подпись */}
      <nav className={classes.tabs} aria-label="Разделы">
        {links('tab')}
      </nav>
    </Box>
  );
}

/** Кнопка в стиле пункта меню — для страниц, где нужна ссылка «назад». */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <UnstyledButton component={Link} href={href} className={classes.back}>
      ← {children}
    </UnstyledButton>
  );
}
