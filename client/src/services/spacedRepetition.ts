import type { QuestionStat } from '@/types';

/**
 * Kertausaikataulu (ohje kohta 13).
 *
 *   Väärin  → 10 minuuttia
 *   Oikein  → 1 pv → 3 pv → 7 pv → 14 pv → 30 pv
 *
 * Jos kysymys menee väärin, aikataulu palaa alkuun.
 */
export const INTERVALS_MS: readonly number[] = [
  10 * 60 * 1000, // 10 minuuttia
  24 * 60 * 60 * 1000, // 1 päivä
  3 * 24 * 60 * 60 * 1000, // 3 päivää
  7 * 24 * 60 * 60 * 1000, // 7 päivää
  14 * 24 * 60 * 60 * 1000, // 14 päivää
  30 * 24 * 60 * 60 * 1000, // 30 päivää
];

export const INTERVAL_LABELS = ['10 min', '1 pv', '3 pv', '7 pv', '14 pv', '30 pv'];

export function scheduleNext(
  previous: QuestionStat | undefined,
  correct: boolean,
  now: number = Date.now(),
): { dueAt: string; intervalIndex: number } {
  const prevIndex = previous?.intervalIndex ?? -1;
  if (!correct) {
    return { dueAt: new Date(now + INTERVALS_MS[0]).toISOString(), intervalIndex: 0 };
  }
  const nextIndex = Math.min(prevIndex + 1, INTERVALS_MS.length - 1);
  return { dueAt: new Date(now + INTERVALS_MS[nextIndex]).toISOString(), intervalIndex: nextIndex };
}

/** Onko kysymys kerrattava nyt? (ohje kohta 25: getDueQuestions) */
export function isDue(stat: QuestionStat | undefined, now: number = Date.now()): boolean {
  if (!stat?.dueAt) return false;
  return new Date(stat.dueAt).getTime() <= now;
}

export function dueLabel(stat: QuestionStat | undefined): string {
  if (!stat?.dueAt) return 'Ei aikataulua';
  const diff = new Date(stat.dueAt).getTime() - Date.now();
  if (diff <= 0) return 'Kerrattava nyt';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes} min kuluttua`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h kuluttua`;
  return `${Math.round(hours / 24)} pv kuluttua`;
}
