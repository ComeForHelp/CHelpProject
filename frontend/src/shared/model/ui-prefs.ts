'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Размер базового шрифта: 18 px по умолчанию, переключатель до 22 px (требование ТЗ). */
export const FONT_SIZES = [18, 20, 22] as const;
export type FontSize = (typeof FONT_SIZES)[number];

/**
 * Версия для слабовидящих (ГОСТ Р 52872-2019 и практика сайтов госорганов):
 * крупный шрифт, контрастные цветовые схемы, интервалы, шрифт, изображения.
 */
export const A11Y_FONT_SIZES = [22, 26, 30] as const;
export type A11yFontSize = (typeof A11Y_FONT_SIZES)[number];

/** Цветовые схемы: чёрный на белом, белый на чёрном, тёмно-синий на голубом, коричневый на бежевом, зелёный на коричневом. */
export type A11yScheme = 'bw' | 'wb' | 'blue' | 'beige' | 'brown';
export type A11ySpacing = 'normal' | 'medium' | 'large';
export type A11yFontFamily = 'sans' | 'serif';
export type A11yImages = 'on' | 'gray' | 'off';

export interface A11yPrefs {
  enabled: boolean;
  fontSize: A11yFontSize;
  scheme: A11yScheme;
  letterSpacing: A11ySpacing;
  lineHeight: A11ySpacing;
  fontFamily: A11yFontFamily;
  images: A11yImages;
  /** Панель настроек свёрнута до одной строки */
  panelCollapsed: boolean;
}

export const A11Y_DEFAULTS: A11yPrefs = {
  enabled: false,
  fontSize: 26,
  scheme: 'bw',
  letterSpacing: 'normal',
  lineHeight: 'normal',
  fontFamily: 'sans',
  images: 'on',
  panelCollapsed: false,
};

interface UiPrefsState {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  a11y: A11yPrefs;
  setA11y: (patch: Partial<A11yPrefs>) => void;
  resetA11y: () => void;
}

export const useUiPrefs = create<UiPrefsState>()(
  persist(
    (set) => ({
      fontSize: 18,
      setFontSize: (fontSize) => set({ fontSize }),
      a11y: A11Y_DEFAULTS,
      setA11y: (patch) => set((s) => ({ a11y: { ...s.a11y, ...patch } })),
      resetA11y: () => set((s) => ({ a11y: { ...A11Y_DEFAULTS, enabled: s.a11y.enabled } })),
    }),
    {
      name: 'chp-ui',
      storage: createJSONStorage(() => localStorage),
      // Старые сохранения без a11y — дополняем значениями по умолчанию
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<UiPrefsState>;
        return { ...current, ...p, a11y: { ...A11Y_DEFAULTS, ...(p.a11y ?? {}) } };
      },
    },
  ),
);

/**
 * Атрибуты для <html>: по ним globals.css перекрашивает и перестраивает страницу.
 * Та же логика продублирована во встроенном скрипте в layout.tsx (до отрисовки, без мигания).
 */
export function htmlA11yAttributes(fontSize: number, a: A11yPrefs): Record<string, string | null> {
  return {
    'data-a11y': a.enabled ? '' : null,
    'data-a11y-scheme': a.enabled ? a.scheme : null,
    'data-a11y-letter': a.enabled ? a.letterSpacing : null,
    'data-a11y-line': a.enabled ? a.lineHeight : null,
    'data-a11y-font': a.enabled ? a.fontFamily : null,
    'data-a11y-images': a.enabled ? a.images : null,
    fontSize: `${a.enabled ? a.fontSize : fontSize}px`,
  };
}
