import { getBundle } from '@/data/bundle';
import type { Category, ProgressState } from '@/types';
import { activeQuestions, currentSpeciesPool } from './pool';
import { speciesPercent } from './speciesEngine';
import { getWeakQuestions } from './questionEngine';

export interface Accuracy {
  attempts: number;
  correct: number;
  percent: number;
}

function ratio(correct: number, attempts: number): number {
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

export function theoryCategories(): Category[] {
  return getBundle().categories.filter((c) => !c.speciesSection);
}

export function categoryAccuracy(state: ProgressState, categoryId: string): Accuracy {
  let attempts = 0;
  let correct = 0;
  for (const q of activeQuestions()) {
    if (q.category !== categoryId) continue;
    const stat = state.questionStats[q.id];
    attempts += stat?.attempts ?? 0;
    correct += stat?.correct ?? 0;
  }
  return { attempts, correct, percent: ratio(correct, attempts) };
}

export function theoryAccuracy(state: ProgressState): Accuracy {
  let attempts = 0;
  let correct = 0;
  for (const stat of Object.values(state.questionStats)) {
    attempts += stat.attempts ?? 0;
    correct += stat.correct ?? 0;
  }
  return { attempts, correct, percent: ratio(correct, attempts) };
}

export function examAccuracy(state: ProgressState): Accuracy {
  const exams = state.exams;
  if (!exams.length) return { attempts: 0, correct: 0, percent: 0 };
  const correct = exams.reduce((s, e) => s + e.correct, 0);
  const attempts = exams.reduce((s, e) => s + e.totalQuestions, 0);
  return { attempts, correct, percent: ratio(correct, attempts) };
}

export function speciesAccuracy(state: ProgressState): Accuracy {
  let attempts = 0;
  let correct = 0;
  for (const stat of Object.values(state.speciesStats)) {
    attempts += stat.attempts ?? 0;
    correct += stat.correct ?? 0;
  }
  return { attempts, correct, percent: ratio(correct, attempts) };
}

/** Kokonaisosaaminen = teoria + lajintuntemus + harjoituskokeet yhdessä. */
export function overallAccuracy(state: ProgressState): Accuracy {
  const theory = theoryAccuracy(state);
  const sp = speciesAccuracy(state);
  const attempts = theory.attempts + sp.attempts;
  const correct = theory.correct + sp.correct;
  return { attempts, correct, percent: ratio(correct, attempts) };
}

/** Värikoodi: 🔴 alle 65 %, 🟡 65–84 %, 🟢 vähintään 85 % (ohje kohdat 1 ja 44). */
export function levelOf(
  percent: number,
  answered = true,
): { color: 'red' | 'yellow' | 'green' | 'none'; dot: string; label: string } {
  if (!answered) return { color: 'none', dot: '⚪', label: 'Ei vielä dataa' };
  if (percent < 65) return { color: 'red', dot: '🔴', label: 'Heikko' };
  if (percent < 85) return { color: 'yellow', dot: '🟡', label: 'Kohtalainen' };
  return { color: 'green', dot: '🟢', label: 'Hyvä' };
}

export interface Recommendation {
  categoryId: string;
  category: Category;
  percent: number;
  reason: string;
}

/**
 * Suositus siitä, mitä kannattaa harjoitella seuraavaksi (ohje kohdat 1 ja 14).
 * Harjoittelemattomat alueet nostetaan esiin, koska niistä ei ole vielä dataa.
 */
export function recommendNext(state: ProgressState): Recommendation | null {
  const scored = theoryCategories()
    .map((category) => {
      const accuracy = categoryAccuracy(state, category.id);
      const score = accuracy.attempts === 0 ? 55 : accuracy.percent;
      return { category, accuracy, score };
    })
    .sort((a, b) => a.score - b.score);

  const weakest = scored[0];
  if (!weakest) return null;

  const reason =
    weakest.accuracy.attempts === 0
      ? 'Tätä aihealuetta et ole vielä harjoitellut lainkaan.'
      : `Onnistumisprosenttisi tässä aihealueessa on ${weakest.accuracy.percent} %.`;

  return {
    categoryId: weakest.category.id,
    category: weakest.category,
    percent: weakest.accuracy.percent,
    reason,
  };
}

/** Viikkoaktiivisuus: montako kysymystä minäkin viikonpäivänä on vastattu. */
export function weeklyActivity(state: ProgressState): { date: string; label: string; count: number }[] {
  const labels = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'];
  const days: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    let count = 0;
    for (const stat of [...Object.values(state.questionStats), ...Object.values(state.speciesStats)]) {
      if (stat.lastAnswered?.slice(0, 10) === key) count += 1;
    }
    days.push({ date: key, label: labels[(d.getDay() + 6) % 7], count });
  }
  return days;
}

export interface Summary {
  overall: Accuracy;
  theory: Accuracy;
  species: Accuracy;
  exams: Accuracy;
  categories: { category: Category; accuracy: Accuracy }[];
  weakCount: number;
  speciesCoverage: { recognised: number; total: number };
}

export function buildSummary(state: ProgressState): Summary {
  const pool = currentSpeciesPool();
  return {
    overall: overallAccuracy(state),
    theory: theoryAccuracy(state),
    species: speciesAccuracy(state),
    exams: examAccuracy(state),
    categories: theoryCategories().map((category) => ({ category, accuracy: categoryAccuracy(state, category.id) })),
    weakCount: getWeakQuestions(state, 999).length,
    speciesCoverage: {
      recognised: pool.filter((s) => (state.speciesStats[s.id]?.correct ?? 0) > 0).length,
      total: pool.length,
    },
  };
}

export { speciesPercent };
