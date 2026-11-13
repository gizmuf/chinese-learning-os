'use client';

import {ThemeProvider, useTheme} from 'next-themes';
import {useEffect, useState, type ReactNode} from 'react';
import {useI18n} from './i18n';

// Device-local display preference only: never stored in a student's learning records.
export function AppearanceProvider({children}: {children: ReactNode}) {
  return <ThemeProvider attribute="data-theme" storageKey="chinese-os-appearance" defaultTheme="light" enableSystem disableTransitionOnChange>{children}</ThemeProvider>;
}

const labels = {
  en: ['Appearance', 'System', 'Light', 'Dark'],
  fr: ['Apparence', 'Système', 'Clair', 'Sombre'],
  ru: ['Оформление', 'Системное', 'Светлое', 'Тёмное'],
  tr: ['Görünüm', 'Sistem', 'Açık', 'Koyu'],
};

export function AppearanceControls() {
  const {locale} = useI18n();
  const {theme, setTheme} = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const copy = labels[locale];
  return <fieldset className="appearance-controls"><legend>{copy[0]}</legend><div>
    {(['system', 'light', 'dark'] as const).map((value, index) => <button key={value} type="button" className="secondary" disabled={!mounted} aria-pressed={mounted && theme === value} onClick={() => setTheme(value)}>{copy[index + 1]}</button>)}
  </div></fieldset>;
}
