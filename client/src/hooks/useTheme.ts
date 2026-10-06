import { useCallback, useEffect, useState } from 'react';
import { readStore, writeStore, STORAGE_KEYS } from '@/lib/storage';

export type ThemeChoice = 'light' | 'dark' | 'system';

export interface Settings {
  theme: ThemeChoice;
  dailyGoal: number;
  haptics: boolean;
}

const DEFAULTS: Settings = { theme: 'system', dailyGoal: 15, haptics: true };

/** Ohje kohta 43: vaalea, tumma tai järjestelmän mukaan. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULTS,
    ...readStore<Partial<Settings>>(STORAGE_KEYS.settings, {}),
  }));

  useEffect(() => {
    writeStore(STORAGE_KEYS.settings, settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0b1220' : '#166534');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, update };
}

export function haptic(ms = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ei tueta */
    }
  }
}
