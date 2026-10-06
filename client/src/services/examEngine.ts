import type { ExamMode, Question, Species } from '@/types';
import { activeQuestions, currentSpeciesPool } from './pool';
import { shuffle } from './questionEngine';
import { getBundle, getMode } from '@/data/bundle';

export interface ExamItem {
  itemId: string;
  kind: 'theory' | 'species';
  category: string;
  prompt: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
  imageUrl?: string;
  attribution?: string;
  difficulty: number;
}

export interface ExamState {
  id: string;
  mode: 'full' | 'quick';
  startedAt: number;
  endAt: number;
  /** Lajintuntemusosion oma aikaraja (ohje kohta 9). */
  speciesEndAt: number;
  speciesCount: number;
  timed: boolean;
  items: ExamItem[];
  /** itemId → valitun vaihtoehdon indeksi */
  answers: Record<string, number>;
  flagged: string[];
  currentIndex: number;
  finished: boolean;
}

export interface ExamReviewRow {
  item: ExamItem;
  chosenIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

export interface ExamResult {
  examId: string;
  mode: 'full' | 'quick';
  total: number;
  correct: number;
  percent: number;
  passed: boolean;
  passPercent: number;
  durationSeconds: number;
  theory: { correct: number; total: number };
  species: { correct: number; total: number };
  categoryBreakdown: Record<string, { correct: number; total: number }>;
  review: ExamReviewRow[];
}

/** Arpoo yhden kuvan lajin kuvavalikoimasta (deterministisesti rng:llä). */
function pickImage(species: Species, rng: () => number) {
  if (!species.images.length) return undefined;
  return species.images[Math.floor(rng() * species.images.length)];
}

/** Valitsee teoriakysymykset konfiguroidun jakauman mukaan (ohje kohta 11). */
function selectTheory(mode: ExamMode, rng: () => number): Question[] {
  const pool = activeQuestions();
  const distribution = getBundle().examConfig.distribution;
  const picked: Question[] = [];
  const used = new Set<string>();

  for (const [category, count] of Object.entries(distribution)) {
    if (category.startsWith('$')) continue;
    const candidates = shuffle(
      pool.filter((q) => q.category === category),
      rng,
    );
    for (const q of candidates.slice(0, count)) {
      if (!used.has(q.id)) {
        picked.push(q);
        used.add(q.id);
      }
    }
  }

  if (picked.length < mode.theoryCount) {
    for (const q of shuffle(pool.filter((x) => !used.has(x.id)), rng)) {
      if (picked.length >= mode.theoryCount) break;
      picked.push(q);
      used.add(q.id);
    }
  }
  return picked.slice(0, mode.theoryCount);
}

function selectSpeciesItems(mode: ExamMode, rng: () => number): ExamItem[] {
  const pool = currentSpeciesPool();
  const distribution = getBundle().examConfig.speciesDistribution;
  const chosen: Species[] = [];
  const used = new Set<string>();

  for (const [type, count] of Object.entries(distribution)) {
    if (type.startsWith('$')) continue;
    for (const s of shuffle(
      pool.filter((x) => x.type === type),
      rng,
    ).slice(0, count)) {
      if (!used.has(s.id)) {
        chosen.push(s);
        used.add(s.id);
      }
    }
  }
  if (chosen.length < mode.speciesCount) {
    for (const s of shuffle(pool.filter((x) => !used.has(x.id)), rng)) {
      if (chosen.length >= mode.speciesCount) break;
      chosen.push(s);
      used.add(s.id);
    }
  }

  return chosen.slice(0, mode.speciesCount).map((species) => {
    const distractors = shuffle(pool.filter((s) => s.id !== species.id), rng).slice(0, 3);
    const options = shuffle(
      [{ text: species.nameFi, correct: true }, ...distractors.map((d) => ({ text: d.nameFi, correct: false }))],
      rng,
    );
    // Kuva arvotaan lajin kaikista tunnistuskuvista, joten sama laji voi tulla
    // eri kuvalla eri kokeissa (valokuvausasento vaihtelee → parempi tunnistustaito).
    const image = pickImage(species, rng);
    return {
      itemId: `species:${species.id}`,
      kind: 'species' as const,
      category: 'lajintuntemus',
      prompt: 'Mikä laji on kuvassa?',
      options,
      explanation: `${species.nameFi} (${species.scientific}). ${species.identificationTips}`,
      imageUrl: image?.image_url,
      attribution: image?.attribution,
      difficulty: species.difficulty,
    };
  });
}

export function createExam(modeId: 'full' | 'quick', seed = Date.now()): ExamState {
  // Deterministinen satunnaisluku mahdollistaa saman kokeen toistamisen (esim. testit).
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const mode = getMode(modeId);
  const speciesItems = selectSpeciesItems(mode, rng);
  const theoryItems: ExamItem[] = selectTheory(mode, rng).map((q) => ({
    itemId: `theory:${q.id}`,
    kind: 'theory' as const,
    category: q.category,
    prompt: q.question,
    options: q.answers,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }));

  // Virallisessa tutkinnossa lajintuntemus suoritetaan ensin (ohje kohta 9).
  const items = [...speciesItems, ...theoryItems];

  const startedAt = Date.now();
  return {
    id: `exam-${startedAt.toString(36)}`,
    mode: modeId,
    startedAt,
    endAt: startedAt + mode.totalTimeSeconds * 1000,
    speciesEndAt: startedAt + mode.speciesTimeSeconds * 1000,
    speciesCount: speciesItems.length,
    timed: true,
    items,
    answers: {},
    flagged: [],
    currentIndex: 0,
    finished: false,
  };
}

/**
 * Aikaraja ei nojaa setInterval-laskuriin vaan aikaleimoihin (ohje kohta 27),
 * joten selaimen jäätyminen tai välilehden vaihto ei riko aikaa.
 */
export function remainingMs(exam: ExamState, now = Date.now()): number {
  return Math.max(0, exam.endAt - now);
}

/** Kulloinkin voimassa oleva aikaraja: lajintuntemusosiossa oma, tiukempi raja. */
export function activeDeadline(exam: ExamState): number {
  const inSpeciesSection = exam.currentIndex < exam.speciesCount;
  return inSpeciesSection ? Math.min(exam.endAt, exam.speciesEndAt) : exam.endAt;
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function answer(exam: ExamState, itemId: string, optionIndex: number): ExamState {
  return { ...exam, answers: { ...exam.answers, [itemId]: optionIndex } };
}

export function toggleFlag(exam: ExamState, itemId: string): ExamState {
  const flagged = exam.flagged.includes(itemId)
    ? exam.flagged.filter((id) => id !== itemId)
    : [...exam.flagged, itemId];
  return { ...exam, flagged };
}

export function goTo(exam: ExamState, index: number): ExamState {
  const clamped = Math.max(0, Math.min(exam.items.length - 1, index));
  return { ...exam, currentIndex: clamped };
}

export function calculateResult(exam: ExamState, now = Date.now()): ExamResult {
  const review: ExamReviewRow[] = exam.items.map((item) => {
    const chosenIndex = exam.answers[item.itemId] ?? null;
    const correctIndex = item.options.findIndex((o) => o.correct);
    return { item, chosenIndex, correctIndex, isCorrect: chosenIndex === correctIndex };
  });

  const correct = review.filter((r) => r.isCorrect).length;
  const total = review.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const mode = getMode(exam.mode);

  const categoryBreakdown: Record<string, { correct: number; total: number }> = {};
  for (const row of review) {
    const entry = categoryBreakdown[row.item.category] ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (row.isCorrect) entry.correct += 1;
    categoryBreakdown[row.item.category] = entry;
  }

  const theoryRows = review.filter((r) => r.item.kind === 'theory');
  const speciesRows = review.filter((r) => r.item.kind === 'species');

  return {
    examId: exam.id,
    mode: exam.mode,
    total,
    correct,
    percent,
    passed: percent >= mode.passPercent,
    passPercent: mode.passPercent,
    durationSeconds: Math.round((Math.min(now, exam.endAt) - exam.startedAt) / 1000),
    theory: { correct: theoryRows.filter((r) => r.isCorrect).length, total: theoryRows.length },
    species: { correct: speciesRows.filter((r) => r.isCorrect).length, total: speciesRows.length },
    categoryBreakdown,
    review,
  };
}
