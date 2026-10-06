import type { Achievement, ProgressState } from '@/types';

/** Saavutukset (ohje kohta 16). */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-practice', icon: '🏆', title: 'Ensimmäinen harjoitus', description: 'Vastaa ensimmäiseen kysymykseen.' },
  { id: 'questions-100', icon: '📚', title: '100 kysymystä', description: 'Vastaa yhteensä 100 kysymykseen.' },
  { id: 'questions-500', icon: '📖', title: '500 kysymystä', description: 'Vastaa yhteensä 500 kysymykseen.' },
  { id: 'streak-7', icon: '🔥', title: '7 päivän putki', description: 'Harjoittele seitsemänä päivänä peräkkäin.' },
  { id: 'all-species', icon: '🦌', title: 'Kaikki lajit tunnistettu', description: 'Tunnista jokainen laji vähintään kerran oikein.' },
  { id: 'exam-90', icon: '🎯', title: '90 % harjoituskokeessa', description: 'Saavuta vähintään 90 % harjoituskokeessa.' },
  { id: 'exam-pass', icon: '✅', title: 'Harjoituskoe läpi', description: 'Läpäise täysi harjoituskoe.' },
  { id: 'daily-10', icon: '💎', title: 'Kymmenen päivän putki', description: 'Harjoittele kymmenenä päivänä peräkkäin.' },
];

export function totalAttempts(state: ProgressState): number {
  return (
    Object.values(state.questionStats).reduce((sum, s) => sum + (s.attempts ?? 0), 0) +
    Object.values(state.speciesStats).reduce((sum, s) => sum + (s.attempts ?? 0), 0)
  );
}

/**
 * Palauttaa saavutusten id:t, jotka käyttäjän kuuluisi saada.
 * `speciesTotal` tarvitaan "kaikki lajit" -saavutukseen.
 */
export function evaluateAchievements(state: ProgressState, speciesTotal: number): string[] {
  const attempts = totalAttempts(state);
  const unlocked = new Set<string>();

  if (attempts >= 1) unlocked.add('first-practice');
  if (attempts >= 100) unlocked.add('questions-100');
  if (attempts >= 500) unlocked.add('questions-500');
  if ((state.profile.streak ?? 0) >= 7) unlocked.add('streak-7');
  if ((state.profile.streak ?? 0) >= 10) unlocked.add('daily-10');

  const speciesCorrect = Object.values(state.speciesStats).filter((s) => (s.correct ?? 0) > 0).length;
  if (speciesTotal > 0 && speciesCorrect >= speciesTotal) unlocked.add('all-species');

  if (state.exams.some((e) => e.percent >= 90)) unlocked.add('exam-90');
  if (state.exams.some((e) => e.mode === 'full' && e.passed)) unlocked.add('exam-pass');

  return [...unlocked];
}
