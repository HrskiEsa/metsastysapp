/**
 * Ohut localStorage-kerros. Guest-tila (ohje kohta 20) nojaa tähän:
 * kaikki edistyminen tallennetaan selaimeen, ja se voidaan myöhemmin synkata
 * palvelimelle (ks. src/lib/api.ts).
 */
const PREFIX = 'metsastaja.';

export function readStore<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* tila täynnä / yksityinen selaus – ei kaadeta sovellusta */
  }
}

export function removeStore(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ohitetaan */
  }
}

export function exportAll(): string {
  const dump: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      dump[key.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      /* ohitetaan rikkinäinen arvo */
    }
  }
  return JSON.stringify(dump, null, 2);
}

export const STORAGE_KEYS = {
  progress: 'progress.v1',
  settings: 'settings.v1',
} as const;
