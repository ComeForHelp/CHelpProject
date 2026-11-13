'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Размер базового шрифта: 18 px по умолчанию, переключатель до 22 px (требование ТЗ). */
export const FONT_SIZES = [18, 20, 22] as const;
export type FontSize = (typeof FONT_SIZES)[number];

interface UiPrefsState {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

export const useUiPrefs = create<UiPrefsState>()(
  persist(
    (set) => ({
      fontSize: 18,
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: 'chp-ui', storage: createJSONStorage(() => localStorage) },
  ),
);
