import { type CSSVariablesResolver, createTheme, rem } from '@mantine/core';

/**
 * Тема под пожилых пользователей (требования ТЗ для дизайнера):
 *  - базовый шрифт от 18 px: весь интерфейс в rem, а размер html задаёт переключатель (18/20/22);
 *  - кнопки от 48 px: размер lg по умолчанию;
 *  - контраст не ниже 4,5:1: основной цвет — тёмный оттенок 8, «приглушённый» текст — gray.7.
 */
export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 8, dark: 6 },
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'always',
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(30), lineHeight: '1.25' },
      h2: { fontSize: rem(24), lineHeight: '1.3' },
      h3: { fontSize: rem(20), lineHeight: '1.35' },
    },
  },
  components: {
    Button: { defaultProps: { size: 'lg' } },
    TextInput: { defaultProps: { size: 'lg' } },
    PasswordInput: { defaultProps: { size: 'lg' } },
    NumberInput: { defaultProps: { size: 'lg' } },
    Textarea: { defaultProps: { size: 'lg', autosize: true, minRows: 2 } },
    Select: { defaultProps: { size: 'lg' } },
    MultiSelect: { defaultProps: { size: 'lg' } },
    Checkbox: { defaultProps: { size: 'md' } },
    Switch: { defaultProps: { size: 'md' } },
    Radio: { defaultProps: { size: 'md' } },
    SegmentedControl: { defaultProps: { size: 'md' } },
    Modal: { defaultProps: { size: 'lg', centered: true } },
    // Без капса: текст ЗАГЛАВНЫМИ пожилым людям читать труднее
    Badge: {
      defaultProps: { size: 'lg', radius: 'sm', variant: 'light' },
      styles: { label: { textTransform: 'none', fontWeight: 600 } },
    },
  },
});

/** Приглушённый текст темнее стандартного — иначе контраст ниже 4,5:1. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-dimmed': 'var(--mantine-color-gray-7)',
  },
  dark: {},
});
