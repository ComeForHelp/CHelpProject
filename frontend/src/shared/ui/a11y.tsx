'use client';

import { Button, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import {
  A11Y_FONT_SIZES,
  type A11yFontFamily,
  type A11yImages,
  type A11yScheme,
  type A11ySpacing,
  htmlA11yAttributes,
  useUiPrefs,
} from '../model/ui-prefs';
import classes from './a11y.module.css';

/** Применяет размер шрифта и настройки версии для слабовидящих к <html>. */
export function A11yEffect() {
  const fontSize = useUiPrefs((s) => s.fontSize);
  const a11y = useUiPrefs((s) => s.a11y);
  useEffect(() => {
    const html = document.documentElement;
    for (const [name, value] of Object.entries(htmlA11yAttributes(fontSize, a11y))) {
      if (name === 'fontSize') html.style.fontSize = value ?? '';
      else if (value === null) html.removeAttribute(name);
      else html.setAttribute(name, value);
    }
  }, [fontSize, a11y]);
  return null;
}

/** Хранилище читается из localStorage только в браузере — до этого кнопка в «обычном» виде. */
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** Кнопка «Версия для слабовидящих» / «Обычная версия сайта». */
export function A11yToggle() {
  const enabled = useUiPrefs((s) => s.a11y.enabled);
  const setA11y = useUiPrefs((s) => s.setA11y);
  const hydrated = useHydrated();
  const on = hydrated && enabled;
  const label = on ? 'Обычная версия сайта' : 'Версия для слабовидящих';
  return (
    <Button
      variant="subtle"
      color="dark"
      size="md"
      onClick={() => {
        setA11y({ enabled: !on, panelCollapsed: false });
        window.scrollTo({ top: 0 });
      }}
      leftSection={on ? <IconEyeOff size={22} aria-hidden /> : <IconEye size={22} aria-hidden />}
    >
      {label}
    </Button>
  );
}

function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: React.ReactNode; aria?: string; swatch?: A11yScheme }>;
  onChange: (v: T) => void;
}) {
  const id = `a11y-${label.replace(/\s+/g, '-')}`;
  return (
    <div className={classes.group}>
      <Text fw={700} id={id} className={classes.groupLabel}>
        {label}
      </Text>
      <Group gap={6} role="group" aria-labelledby={id} wrap="wrap">
        {options.map((o) => (
          <Button
            key={String(o.value)}
            size="md"
            variant={value === o.value ? 'filled' : 'default'}
            aria-pressed={value === o.value}
            aria-label={o.aria}
            data-a11y-swatch={o.swatch}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </Group>
    </div>
  );
}

const SPACING: Array<{ value: A11ySpacing; label: string }> = [
  { value: 'normal', label: 'Обычный' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Большой' },
];

/**
 * Панель настроек версии для слабовидящих — вверху каждой страницы, пока режим включён.
 * Не прячется в меню: можно свернуть до одной строки, но кнопки «Настройки» и «Обычная версия» видны всегда.
 */
export function A11yPanel() {
  const a = useUiPrefs((s) => s.a11y);
  const setA11y = useUiPrefs((s) => s.setA11y);
  const resetA11y = useUiPrefs((s) => s.resetA11y);
  const hydrated = useHydrated();
  // Обычный режим: тонкая строка над шапкой с кнопкой входа в версию для слабовидящих
  if (!hydrated || !a.enabled) {
    return (
      <div className={classes.bar}>
        <div className={classes.barInner}>
          <A11yToggle />
        </div>
      </div>
    );
  }

  return (
    <Paper
      component="section"
      aria-label="Настройки версии для слабовидящих"
      radius={0}
      className={classes.panel}
    >
      <Stack gap="sm" className={classes.inner}>
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Text fw={700} size="lg">
            Версия для слабовидящих
          </Text>
          <Group gap="xs" wrap="wrap">
            <UnstyledButton
              className={classes.collapse}
              onClick={() => setA11y({ panelCollapsed: !a.panelCollapsed })}
              aria-expanded={!a.panelCollapsed}
            >
              {a.panelCollapsed ? (
                <IconChevronDown size={20} aria-hidden />
              ) : (
                <IconChevronUp size={20} aria-hidden />
              )}
              {a.panelCollapsed ? 'Показать настройки' : 'Свернуть настройки'}
            </UnstyledButton>
            <Button
              size="md"
              variant="default"
              leftSection={<IconEyeOff size={20} aria-hidden />}
              onClick={() => setA11y({ enabled: false })}
            >
              Обычная версия сайта
            </Button>
          </Group>
        </Group>

        {!a.panelCollapsed && (
          <div className={classes.grid}>
            <Choice
              label="Размер шрифта"
              value={a.fontSize}
              onChange={(fontSize) => setA11y({ fontSize })}
              options={A11Y_FONT_SIZES.map((size, i) => ({
                value: size,
                label: <span style={{ fontSize: `${1 + i * 0.2}em` }}>А{'+'.repeat(i)}</span>,
                aria: `Шрифт ${size} пикселей`,
              }))}
            />
            <Choice<A11yScheme>
              label="Цвета"
              value={a.scheme}
              onChange={(scheme) => setA11y({ scheme })}
              options={[
                { value: 'bw', label: 'Ц', aria: 'Чёрный текст на белом', swatch: 'bw' },
                { value: 'wb', label: 'Ц', aria: 'Белый текст на чёрном', swatch: 'wb' },
                { value: 'blue', label: 'Ц', aria: 'Тёмно-синий на голубом', swatch: 'blue' },
                { value: 'beige', label: 'Ц', aria: 'Коричневый на бежевом', swatch: 'beige' },
                { value: 'brown', label: 'Ц', aria: 'Зелёный на коричневом', swatch: 'brown' },
              ]}
            />
            <Choice<A11ySpacing>
              label="Интервал между буквами"
              value={a.letterSpacing}
              onChange={(letterSpacing) => setA11y({ letterSpacing })}
              options={SPACING}
            />
            <Choice<A11ySpacing>
              label="Интервал между строками"
              value={a.lineHeight}
              onChange={(lineHeight) => setA11y({ lineHeight })}
              options={SPACING}
            />
            <Choice<A11yFontFamily>
              label="Шрифт"
              value={a.fontFamily}
              onChange={(fontFamily) => setA11y({ fontFamily })}
              options={[
                { value: 'sans', label: 'Без засечек' },
                { value: 'serif', label: 'С засечками' },
              ]}
            />
            <Choice<A11yImages>
              label="Изображения"
              value={a.images}
              onChange={(images) => setA11y({ images })}
              options={[
                { value: 'on', label: 'Показывать' },
                { value: 'gray', label: 'Чёрно-белые' },
                { value: 'off', label: 'Скрыть' },
              ]}
            />
            <div className={classes.group}>
              <Text fw={700} className={classes.groupLabel}>
                &nbsp;
              </Text>
              <Button size="md" variant="default" onClick={resetA11y}>
                Вернуть настройки по умолчанию
              </Button>
            </div>
          </div>
        )}
      </Stack>
    </Paper>
  );
}
