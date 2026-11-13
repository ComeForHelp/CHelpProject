import {
  type CSSVariablesResolver,
  type MantineColorsTuple,
  createTheme,
  rem,
} from '@mantine/core';

/**
 * Тема по макету «Иду на помощь!» (Figma Make, idu_help_refined).
 *
 * Цвета взяты из итоговых токенов макета; все пары текст/фон проверены — контраст не ниже 4,5:1.
 * Исходный оранжевый #E86200 на белом даёт только 3,4:1, поэтому кнопки — #B94A00 (5,2:1), как в макете.
 *
 * Два параметра оставлены по ТЗ, а не по макету:
 *  - базовый шрифт 18 px (в макете 16), переключатель до 22 px;
 *  - высота кнопок и полей от 48 px (в макете 40–44).
 */

/** Оранжевый: [0] фон акцента … [6] основная кнопка … [8] текст на светлом. */
const brand: MantineColorsTuple = [
  '#FFF0E6', // gl — светлый фон акцента
  '#FCE7D9', // активный пункт меню
  '#FBD3B6',
  '#F5AE7E',
  '#EE8A47',
  '#E86200', // исходный оранжевый — только для крупных декоративных элементов
  '#B94A00', // g — кнопки, ссылки-акценты (5,2:1 с белым)
  '#963B00', // gd — наведение, текст вторичной кнопки (7,2:1)
  '#7F3100', // текст активного пункта меню (7,5:1)
  '#5C2400',
];

/** Нейтральные тёплые серые макета. */
const ink: MantineColorsTuple = [
  '#F5F7F6', // bg — фон боковой панели и секций
  '#EBEFED',
  '#D5DDD9', // line — границы
  '#B7C2BD',
  '#8FA39A',
  '#6B7772',
  '#59625E', // ink2 — вторичный текст (6,3:1)
  '#3F4A46',
  '#29231F', // ink — основной текст (15,5:1)
  '#1A1614',
];

export const FONT_HEADING = 'var(--font-montserrat), Montserrat, system-ui, sans-serif';
export const FONT_BODY =
  'var(--font-inter), Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const theme = createTheme({
  colors: { brand, ink },
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  black: '#29231F',
  fontFamily: FONT_BODY,
  defaultRadius: 'md',
  radius: { xs: rem(6), sm: rem(8), md: rem(10), lg: rem(14), xl: rem(20) },
  cursorType: 'pointer',
  focusRing: 'always',
  headings: {
    fontFamily: FONT_HEADING,
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(36), lineHeight: '1.2' },
      h2: { fontSize: rem(26), lineHeight: '1.25' },
      h3: { fontSize: rem(20), lineHeight: '1.3' },
      h4: { fontSize: rem(18), lineHeight: '1.3' },
    },
  },
  shadows: { xs: '0 1px 2px rgba(41, 35, 31, 0.06)', sm: '0 2px 8px rgba(41, 35, 31, 0.08)' },
  components: {
    Button: {
      defaultProps: { size: 'lg' },
      styles: { root: { fontFamily: FONT_HEADING, fontWeight: 650 } },
    },
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
    Modal: { defaultProps: { size: 'lg', centered: true, radius: 'lg' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Input: {
      styles: { input: { borderWidth: 1, borderColor: 'var(--mantine-color-ink-2)' } },
    },
    InputWrapper: { styles: { label: { fontWeight: 600, marginBottom: 6 } } },
    // Без капса: текст ЗАГЛАВНЫМИ пожилым людям читать труднее
    Badge: {
      defaultProps: { size: 'lg', radius: 'xl', variant: 'light' },
      styles: { label: { textTransform: 'none', fontWeight: 600 } },
    },
  },
});

/** Переменные макета для приглушённого текста, границ и фона. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-dimmed': 'var(--mantine-color-ink-6)',
    '--mantine-color-default-border': 'var(--mantine-color-ink-2)',
    '--mantine-color-text': 'var(--mantine-color-ink-8)',
    '--mantine-color-body': '#FFFFFF',
    '--mantine-color-anchor': 'var(--mantine-color-brand-7)',
  },
  dark: {},
});
