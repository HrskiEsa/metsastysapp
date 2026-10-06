import type { ProgressState, Question, Species } from '@/types';
import { activeQuestions, currentSpeciesPool } from './pool';

export type PracticeMode =
  | 'all'
  | 'category'
  | 'weak'
  | 'wrong'
  | 'difficult'
  | 'due'
  | 'daily'
  | 'exam-lite';

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getRandomQuestion(pool: Question[] = activeQuestions()): Question | undefined {
  const items = pool.filter((q) => !q.validUntil);
  return items[Math.floor(Math.random() * items.length)];
}

export function getQuestionsByCategory(category: string, pool: Question[] = activeQuestions()): Question[] {
  return pool.filter((q) => q.category === category);
}

/** Kysymykset, joissa onnistuminen on alle 60 % (ohje kohdat 12 ja 14). */
export function getWeakQuestions(state: ProgressState, limit = 20, pool: Question[] = activeQuestions()): Question[] {
  const scored = pool
    .map((q) => {
      const stat = state.questionStats[q.id];
      const attempts = stat?.attempts ?? 0;
      const percent = attempts ? (stat!.correct / attempts) * 100 : 0;
      return { q, attempts, percent };
    })
    .filter((x) => x.attempts >= 1 && x.percent < 60)
    .sort((a, b) => a.percent - b.percent || b.attempts - a.attempts);
  return scored.slice(0, limit).map((x) => x.q);
}

/** Kysymykset, jotka on vastattu väärin vähintään kerran (ohje kohta 2). */
export function getWrongQuestions(state: ProgressState, pool: Question[] = activeQuestions()): Question[] {
  return pool
    .filter((q) => (state.questionStats[q.id]?.wrong ?? 0) > 0)
    .sort((a, b) => (state.questionStats[b.id]?.wrong ?? 0) - (state.questionStats[a.id]?.wrong ?? 0));
}

/** Kertausaikataulun mukaan erääntyneet kysymykset (ohje kohdat 13 ja 25). */
export function getDueQuestions(
  state: ProgressState,
  now: number = Date.now(),
  pool: Question[] = activeQuestions(),
): Question[] {
  return pool
    .filter((q) => {
      const due = state.questionStats[q.id]?.dueAt;
      return due ? new Date(due).getTime() <= now : false;
    })
    .sort(
      (a, b) =>
        new Date(state.questionStats[a.id]!.dueAt!).getTime() - new Date(state.questionStats[b.id]!.dueAt!).getTime(),
    );
}

/** Vaikeat kysymykset: vaikeustaso ≥ 4. */
export function getDifficultQuestions(pool: Question[] = activeQuestions()): Question[] {
  return pool.filter((q) => q.difficulty >= 4);
}

export interface SessionOptions {
  mode: PracticeMode;
  category?: string;
  count?: number;
  includeSpecies?: boolean;
  speciesCount?: number;
  state: ProgressState;
  speciesPool?: Species[];
}

export interface PracticeItem {
  kind: 'theory' | 'species';
  question?: Question;
  species?: Species;
  options?: { text: string; correct: boolean }[];
}

export function buildPracticeSession(opts: SessionOptions): PracticeItem[] {
  const { mode, category, state, includeSpecies } = opts;
  const count = opts.count ?? 10;
  const pool = activeQuestions();

  let theory: Question[] = [];
  switch (mode) {
    case 'category':
      theory = category ? getQuestionsByCategory(category, pool) : pool;
      break;
    case 'weak':
      theory = getWeakQuestions(state, count * 3, pool);
      break;
    case 'wrong':
      theory = getWrongQuestions(state, pool);
      break;
    case 'difficult':
      theory = getDifficultQuestions(pool);
      break;
    case 'due':
      theory = getDueQuestions(state, Date.now(), pool);
      break;
    default:
      theory = pool;
  }

  if (theory.length === 0) theory = pool;

  // Painotetaan heikosti menestyneitä kysymyksiä kaikissa muissa paitsi kategoria- ja vaikeustilassa.
  const weighted =
    mode === 'category' || mode === 'weak' || mode === 'wrong' || mode === 'due'
      ? theory
      : shuffle(theory).sort((a, b) => {
          const sa = state.questionStats[a.id];
          const sb = state.questionStats[b.id];
          const pa = sa?.attempts ? sa.correct / sa.attempts : 0.5;
          const pb = sb?.attempts ? sb.correct / sb.attempts : 0.5;
          return pa - pb;
        });

  const picked = weighted.slice(0, Math.max(1, count));
  const items: PracticeItem[] = picked.map((question) => ({ kind: 'theory', question }));

  if (includeSpecies) {
    const pool2 = opts.speciesPool ?? currentSpeciesPool();
    const speciesCount = opts.speciesCount ?? Math.max(2, Math.round(count / 3));
    items.push(...buildSpeciesItemBatch(pool2, speciesCount));
  }

  return shuffle(items);
}

/** Rakentaa lajintunnistuskysymyksen: 4 vaihtoehtoa, joista yksi oikea. */
export function buildSpeciesItem(species: Species, pool: Species[]): PracticeItem {
  const distractors = shuffle(pool.filter((s) => s.id !== species.id)).slice(0, 3);
  const options = shuffle([
    { text: species.nameFi, correct: true },
    ...distractors.map((d) => ({ text: d.nameFi, correct: false })),
  ]);
  // Kuvan valinta tehdään vasta esitysvaiheessa (ks. QuizRunner), jolloin sama
  // laji harjoitellaan vaihtuvilla kuvilla.
  return { kind: 'species', species, options };
}

export function buildSpeciesItemBatch(pool: Species[], count: number): PracticeItem[] {
  return shuffle(pool)
    .slice(0, Math.max(1, count))
    .map((s) => buildSpeciesItem(s, pool));
}

/** Päivän harjoitus: 10 teoriaa + 5 lajintuntemusta (ohje kohta 15). */
export function buildDailySession(state: ProgressState): PracticeItem[] {
  const theoryCount = 10;
  const speciesCount = 5;
  const theoryPool = activeQuestions();
  const weak = getWeakQuestions(state, theoryCount, theoryPool);
  const rest = shuffle(theoryPool.filter((q) => !weak.some((w) => w.id === q.id)));
  const theory = [...weak, ...rest].slice(0, theoryCount);
  const speciesItems = buildSpeciesItemBatch(currentSpeciesPool(), speciesCount);
  return shuffle([...theory.map((question) => ({ kind: 'theory' as const, question })), ...speciesItems]);
}
